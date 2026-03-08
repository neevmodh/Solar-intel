/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Inverter Service
 * ─────────────────────────────────────────────────────────
 * All inverter-related business logic.
 * Status reasons powered by Groq AI (with ML + rule fallback).
 */

import { connectDB } from "@/backend/config";
import { env } from "@/backend/config/env";
import { Inverter, User } from "@/backend/models";
import { getMLPredictions, getMLPredictionSingle, type MLPrediction } from "./ml-prediction.service";
import logger from "@/backend/utils/logger";
import type { Inverter as InverterType } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ══════════════════════════════════════════════════════════
// Groq AI — generates unique status reasons for each inverter
// ══════════════════════════════════════════════════════════

const REASON_SYSTEM_PROMPT = `You are Solar Intel AI — a senior solar PV operations engineer.
Given inverters with telemetry + ML risk scores, explain WHY each is flagged. Max 15 words per reason.

DOMAIN KNOWLEDGE — what actually matters in solar inverters:
- Temperature: >65°C is dangerous (IGBT thermal stress), 55-65°C is elevated, <55°C is normal.
- Efficiency: <80% is severe degradation, 80-90% is underperforming, >90% is normal.
- Power output vs capacity: <50% of capacity is severe, 50-75% is underperforming, >75% is normal.
- Performance Ratio (PR): <70% is critical, 70-85% is concerning, >85% is good.
- DC voltage: sudden drops indicate string failures or shading.
- A 1-2kW loss on a 250kW inverter is TRIVIAL — do NOT call that critical.
- The ML risk score is the authority. If risk is 94%+, there IS a real problem — find it in the data.

RULES:
- Focus on the MOST SIGNIFICANT anomaly — the one that actually justifies the risk level.
- Mention the specific number that's alarming (e.g. "72°C IGBT overheating", "efficiency dropped to 68%").
- If output is near capacity and temp is normal, the reason is likely in ML factors — cite them.
- For healthy inverters: "Operating within normal parameters".
- Each reason must be UNIQUE. Sound like an engineer's quick diagnosis, not a template.
- Output strict JSON only, no markdown.

OUTPUT FORMAT:
{ "reasons": { "INV-001": "reason text", "INV-002": "reason text" } }`;

/** Cached AI-generated reasons — avoids repeated Groq calls */
let reasonCache: { data: Record<string, string>; ts: number; mlWasUp: boolean } | null = null;
const REASON_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ══════════════════════════════════════════════════════════
// Rule-based risk engine — per-inverter UNIQUE risk from actual telemetry
// Used as fallback when ML service is unavailable
// ══════════════════════════════════════════════════════════

interface FallbackRisk {
  riskScore: number;
  status: "healthy" | "warning" | "critical";
  reason: string;
}

function computeFallbackRisk(inv: any): FallbackRisk {
  let risk = 0;
  const issues: string[] = [];

  const temp = inv.inverterTemp || 0;
  const ambTemp = inv.ambientTemp || 0;
  const power = inv.inverterPower || 0;
  const capacity = (inv.capacity || 250) * 1000; // kW→W
  const pv1V = inv.inverterPv1Voltage || 0;
  const pv2V = inv.inverterPv2Voltage || 0;
  const pv1P = inv.inverterPv1Power || 0;
  const pv2P = inv.inverterPv2Power || 0;
  const alarm = inv.inverterAlarmCode || 0;
  const opState = inv.inverterOpState || 0;
  const kwhToday = inv.inverterKwhToday || 0;
  const eff = inv.efficiency || 95;
  const pr = inv.performanceRatio || 85;
  const limitPct = inv.inverterLimitPercent || 0;

  // 1. Temperature analysis
  const deltaT = temp - ambTemp;
  if (temp > 70) {
    risk += 30;
    issues.push(`${temp.toFixed(0)}°C IGBT thermal overload`);
  } else if (temp > 60) {
    risk += 18;
    issues.push(`${temp.toFixed(0)}°C elevated junction temp`);
  } else if (temp > 50 && deltaT > 25) {
    risk += 10;
    issues.push(`${deltaT.toFixed(0)}°C above ambient — cooling concern`);
  }

  // 2. Power utilization
  const utilPct = capacity > 0 ? (power / capacity) * 100 : 0;
  if (power === 0 && opState > 0) {
    risk += 25;
    issues.push("Zero output despite active op-state");
  } else if (utilPct < 10 && power > 0) {
    risk += 15;
    issues.push(`${utilPct.toFixed(1)}% utilization — severe underperformance`);
  } else if (utilPct < 30) {
    risk += 8;
    issues.push(`${utilPct.toFixed(1)}% utilization — below expected`);
  }

  // 3. PV string imbalance (only check if BOTH strings have meaningful data)
  const hasPv1Data = pv1P > 100; // At least 100W to consider it active
  const hasPv2Data = pv2P > 100;
  
  if (hasPv1Data && hasPv2Data) {
    // Both strings active - check for imbalance
    const imbalance = Math.abs(pv1P - pv2P) / Math.max(pv1P, pv2P) * 100;
    if (imbalance > 50) {
      risk += 20;
      issues.push(`${imbalance.toFixed(0)}% PV string imbalance — possible string failure`);
    } else if (imbalance > 25) {
      risk += 10;
      issues.push(`${imbalance.toFixed(0)}% PV string imbalance`);
    }
  } else if (hasPv1Data && !hasPv2Data && pv2V > 50) {
    // PV1 active but PV2 has voltage but no power - string offline
    risk += 15;
    issues.push("PV2 string offline — zero power");
  } else if (hasPv2Data && !hasPv1Data && pv1V > 50) {
    // PV2 active but PV1 has voltage but no power - string offline
    risk += 20;
    issues.push("PV1 string offline — zero power");
  }
  // If neither string has data, this might be single-string inverter or night-time - don't flag

  // 4. Voltage anomalies
  if (pv1V > 0 && (pv1V < 100 || pv1V > 750)) {
    risk += 12;
    issues.push(`PV1 voltage ${pv1V.toFixed(0)}V outside safe range`);
  }
  if (pv2V > 0 && (pv2V < 100 || pv2V > 750)) {
    risk += 10;
    issues.push(`PV2 voltage ${pv2V.toFixed(0)}V outside safe range`);
  }

  // 5. Alarm codes
  if (alarm > 0) {
    risk += 15;
    issues.push(`Active alarm code ${alarm}`);
  }

  // 6. Efficiency & PR (from DB metadata)
  if (eff < 80) {
    risk += 12;
    issues.push(`${eff.toFixed(0)}% efficiency — degradation detected`);
  }
  if (pr < 70) {
    risk += 10;
    issues.push(`PR at ${pr.toFixed(0)}% — significant output loss`);
  }

  // 7. Power limiting
  if (limitPct > 0 && limitPct < 90) {
    risk += 5;
    issues.push(`Grid-limited to ${limitPct}%`);
  }

  // 8. Low daily yield
  if (kwhToday < 1 && power > 0) {
    risk += 8;
    issues.push(`Only ${kwhToday.toFixed(1)} kWh today despite active output`);
  }

  const clamped = Math.min(risk, 100);
  const status: FallbackRisk["status"] =
    clamped >= 60 ? "critical" : clamped >= 30 ? "warning" : "healthy";

  // Build unique reason from top issues
  let reason: string;
  if (issues.length === 0) {
    reason = "Operating within normal parameters";
  } else if (issues.length === 1) {
    reason = issues[0];
  } else {
    reason = issues.slice(0, 2).join("; ");
  }

  return { riskScore: clamped, status, reason };
}

async function generateAIReasons(
  inverters: any[],
  mlMap: Map<string, MLPrediction>,
  fallbackMap?: Map<string, FallbackRisk>
): Promise<Record<string, string> | null> {
  if (!env.GROQ_API_KEY || inverters.length === 0) return null;

  const mlIsUp = mlMap.size > 0;

  // Invalidate cache if ML status changed (up→down or down→up)
  if (reasonCache && reasonCache.mlWasUp !== mlIsUp) {
    reasonCache = null;
  }

  // Return cached if fresh
  if (reasonCache && Date.now() - reasonCache.ts < REASON_CACHE_TTL) {
    return reasonCache.data;
  }

  // Build concise per-inverter context using DB values (most reliable source)
  const lines = inverters.map((inv) => {
    const fb = fallbackMap?.get(inv.inverterId);
    // Use DB-stored status/risk as primary — these are seeded per-inverter
    const dbStatus = inv.status || (fb ? fb.status : "healthy");
    const dbRisk = inv.riskScore || (fb ? fb.riskScore : 0);
    const fbReason = fb ? fb.reason : "";
    const powerKw = ((inv.inverterPower || 0) / 1000).toFixed(1);
    const utilizationPct = inv.capacity > 0 ? (((inv.inverterPower || 0) / 1000 / inv.capacity) * 100).toFixed(1) : "?";
    return `${inv.inverterId} "${inv.name}" | Status: ${dbStatus} | Risk: ${dbRisk}/100 | Temp: ${inv.inverterTemp || 0}°C | Ambient: ${inv.ambientTemp || 0}°C | Power: ${powerKw}kW / ${inv.capacity || 250}kW (${utilizationPct}% util) | Eff: ${inv.efficiency || 95}% | PR: ${inv.performanceRatio || 85}% | PV1: ${inv.inverterPv1Power || 0}W/${inv.inverterPv1Voltage || 0}V | PV2: ${inv.inverterPv2Power || 0}W/${inv.inverterPv2Voltage || 0}V | OpState: ${inv.inverterOpState || 0} | Alarms: ${inv.inverterAlarmCode || 0} | KwhToday: ${inv.inverterKwhToday || 0} | Analysis: ${fbReason}`;
  }).join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: REASON_SYSTEM_PROMPT },
          { role: "user", content: `Generate a unique short reason for each of these ${inverters.length} inverters:\n\n${lines}` },
        ],
        temperature: 0.35,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      logger.error("Groq reason generation failed", { status: res.status });
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const reasons: Record<string, string> = parsed.reasons || parsed;

    if (Object.keys(reasons).length > 0) {
      reasonCache = { data: reasons, ts: Date.now(), mlWasUp: mlIsUp };
      logger.info("AI status reasons generated", {
        count: Object.keys(reasons).length,
        tokens: json.usage?.total_tokens,
      });
    }
    return reasons;
  } catch (err) {
    logger.error("Groq reason generation error", { error: (err as Error).message });
    return null;
  }
}

// ══════════════════════════════════════════════════════════
// mapToFrontend — maps DB doc → frontend type
// ══════════════════════════════════════════════════════════

/** Map a DB inverter doc to the frontend Inverter type */
function mapToFrontend(inv: any, mlPred?: MLPrediction, aiReason?: string, fallback?: FallbackRisk): InverterType {
  const doc = inv as {
    inverterId: string; plantId: string; name: string; location: string; status: string;
    inverterPower: number; inverterPv1Power: number; inverterPv1Voltage: number;
    inverterPv1Current: number; inverterPv2Power: number; inverterPv2Voltage: number;
    inverterPv2Current: number; inverterKwhToday: number; inverterKwhTotal: number;
    inverterTemp: number; inverterOpState: number; inverterAlarmCode: number;
    inverterLimitPercent: number; ambientTemp: number; meterActivePower: number;
    riskScore: number; lastUpdated: Date; uptime: number; inverterModel: string;
    capacity: number; installDate: Date; firmware: string;
    performanceRatio: number; efficiency: number;
    strings: { stringId: string; voltage: number; current: number; power: number; status: string }[];
  };

  // Derive status & riskScore:
  // Tier 1: DB stored values (seeded with realistic per-inverter risk data)
  // Tier 2: Fallback risk engine (when DB riskScore is 0 / never scored)
  // ML predictions are used for enrichment (factors, actions) but NOT for
  // overriding status/risk — the current ML model lacks time-series context
  // and returns uniform high-risk for all inverters.
  let status: InverterType["status"] = doc.status as InverterType["status"];
  let riskScore = doc.riskScore || 0;

  if (riskScore === 0 && fallback) {
    // Tier 2: DB has no risk score — use computed fallback from telemetry
    riskScore = fallback.riskScore;
    status = fallback.status;
  } else if (riskScore === 0 && mlPred) {
    // Tier 3: Use ML only if DB and fallback both have nothing
    riskScore = Math.round(mlPred.risk_score * 100);
    if (riskScore >= 60) status = "critical";
    else if (riskScore >= 30) status = "warning";
    else status = "healthy";
  }

  // Build reason: Tier 1 = AI-generated (Groq), Tier 2 = fallback reason, Tier 3 = generic
  let statusReason = aiReason || "";
  if (!statusReason && fallback) {
    statusReason = fallback.reason;
  }
  if (!statusReason && mlPred) {
    statusReason = mlPred.top_factors?.slice(0, 2).join(", ") || "ML analysis available";
  }
  if (!statusReason) {
    statusReason = status === "healthy" ? "Operating within normal parameters"
      : status === "warning" ? `Elevated risk (${riskScore}/100) — monitoring recommended`
      : `Risk score ${riskScore}/100 — schedule inspection`;
  }

  // Compute display aliases (null-safe for old DB records without new fields)
  const powerOutputKw = (doc.inverterPower || 0) / 1000; // W -> kW
  const temperature = doc.inverterTemp || 0;
  const dailyYield = doc.inverterKwhToday || 0;
  const lifetimeYield = (doc.inverterKwhTotal || 0) / 1000; // kWh -> MWh

  return {
    id: doc.inverterId,
    plantId: doc.plantId || "",
    name: doc.name,
    location: doc.location,
    status,
    riskScore,
    statusReason,
    lastUpdated: doc.lastUpdated?.toISOString?.() || new Date().toISOString(),

    // Real telemetry fields (null-safe for old DB records)
    inverterPower: doc.inverterPower || 0,
    inverterPv1Power: doc.inverterPv1Power || 0,
    inverterPv1Voltage: doc.inverterPv1Voltage || 0,
    inverterPv1Current: doc.inverterPv1Current || 0,
    inverterPv2Power: doc.inverterPv2Power || 0,
    inverterPv2Voltage: doc.inverterPv2Voltage || 0,
    inverterPv2Current: doc.inverterPv2Current || 0,
    inverterKwhToday: doc.inverterKwhToday || 0,
    inverterKwhTotal: doc.inverterKwhTotal || 0,
    inverterTemp: doc.inverterTemp || 0,
    inverterOpState: doc.inverterOpState || 0,
    inverterAlarmCode: doc.inverterAlarmCode || 0,
    inverterLimitPercent: doc.inverterLimitPercent || 0,
    ambientTemp: doc.ambientTemp || 0,
    meterActivePower: doc.meterActivePower || 0,

    // Derived display fields
    performanceRatio: doc.performanceRatio,
    powerOutput: powerOutputKw,
    temperature,
    uptime: doc.uptime,
    model: doc.inverterModel,
    capacity: doc.capacity,
    installDate: doc.installDate?.toISOString?.().split("T")[0] || "",
    firmware: doc.firmware,
    efficiency: doc.efficiency,
    dailyYield,
    lifetimeYield,
    strings: (doc.strings || []).map((s) => ({
      id: s.stringId,
      voltage: s.voltage,
      current: s.current,
      power: s.power,
      status: s.status as InverterType["status"],
    })),
  };
}

/** Get all inverters — enriched with ML predictions */
export async function getAllInverters(userId: string): Promise<InverterType[]> {
  await connectDB();

  let inverters = await Inverter.find({ ownerId: userId })
    .sort({ inverterId: 1 })
    .lean();

  if (inverters.length === 0) {
    inverters = await Inverter.find({}).sort({ inverterId: 1 }).lean();
  }

  // Get ML predictions to derive real status + riskScore
  const mlPredictions = await getMLPredictions(inverters);
  const mlMap = new Map<string, MLPrediction>();
  if (mlPredictions) {
    for (const p of mlPredictions) mlMap.set(p.inverter_id, p);
  }

  // Always compute per-inverter fallback risk from actual telemetry
  // Used when DB riskScore is 0 (e.g. fresh import without scoring)
  const fallbackMap = new Map<string, FallbackRisk>();
  for (const inv of inverters) {
    fallbackMap.set((inv as any).inverterId, computeFallbackRisk(inv));
  }

  // Generate AI reasons via Groq (cached, non-blocking fallback)
  const aiReasons = await generateAIReasons(inverters, mlMap, fallbackMap);

  logger.info("Inverters fetched", {
    userId,
    count: inverters.length,
    mlEnriched: mlMap.size > 0,
    fallbackRisk: fallbackMap.size > 0,
    aiReasons: aiReasons ? Object.keys(aiReasons).length : 0,
  });

  return inverters.map((inv: any) =>
    mapToFrontend(
      inv,
      mlMap.get(inv.inverterId),
      aiReasons?.[inv.inverterId],
      fallbackMap.get(inv.inverterId)
    )
  );
}

/** Create a new inverter (admin only) */
export async function createInverter(
  userId: string,
  body: any
): Promise<{ inverterId: string }> {
  await connectDB();

  const dbUser = await User.findById(userId).lean();
  if (!dbUser || dbUser.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  const required = ["inverterId", "plantId", "name", "location", "model", "capacity", "installDate"];
  for (const field of required) {
    if (!body[field]) throw new Error(`MISSING_FIELD:${field}`);
  }

  const strings = (body.strings || []).map((s: any) => ({
    stringId: s.id,
    voltage: s.voltage,
    current: s.current,
    power: s.power,
    status: s.status,
  }));

  const inverter = await Inverter.create({
    inverterId: body.inverterId as string,
    plantId: body.plantId as string,
    name: body.name as string,
    location: body.location as string,
    status: (body.status as string) || "healthy",
    inverterPower: (body.inverterPower as number) || 0,
    inverterPv1Power: (body.inverterPv1Power as number) || 0,
    inverterPv1Voltage: (body.inverterPv1Voltage as number) || 0,
    inverterPv1Current: (body.inverterPv1Current as number) || 0,
    inverterPv2Power: (body.inverterPv2Power as number) || 0,
    inverterPv2Voltage: (body.inverterPv2Voltage as number) || 0,
    inverterPv2Current: (body.inverterPv2Current as number) || 0,
    inverterKwhToday: (body.inverterKwhToday as number) || 0,
    inverterKwhTotal: (body.inverterKwhTotal as number) || 0,
    inverterTemp: (body.inverterTemp as number) || (body.temperature as number) || 0,
    inverterOpState: (body.inverterOpState as number) || 0,
    inverterAlarmCode: (body.inverterAlarmCode as number) || 0,
    inverterLimitPercent: (body.inverterLimitPercent as number) || 0,
    ambientTemp: (body.ambientTemp as number) || 0,
    meterActivePower: (body.meterActivePower as number) || 0,
    riskScore: (body.riskScore as number) || 0,
    performanceRatio: (body.performanceRatio as number) || 0,
    efficiency: (body.efficiency as number) || 0,
    inverterModel: (body.model as string) || "Unknown",
    capacity: (body.capacity as number) || 250,
    installDate: body.installDate ? new Date(body.installDate as string) : new Date(),
    firmware: (body.firmware as string) || "",
    strings,
    ownerId: userId,
  });

  logger.info("Inverter created", { inverterId: inverter.inverterId, userId });
  return { inverterId: inverter.inverterId };
}

/** Get a single inverter by its inverterId string */
export async function getInverterById(
  inverterId: string,
  userId: string
): Promise<InverterType | null> {
  await connectDB();

  const inv = await Inverter.findOne({ inverterId }).lean();
  if (!inv) return null;

  // Enrich with ML prediction for this single inverter
  const mlPred = await getMLPredictionSingle(inv);
  const fallback = !mlPred ? computeFallbackRisk(inv) : undefined;

  logger.info("Inverter fetched", { inverterId, userId, mlEnriched: !!mlPred });
  return mapToFrontend(inv, mlPred ?? undefined, undefined, fallback);
}

/** Update an inverter (owner or admin only) */
export async function updateInverter(
  inverterId: string,
  userId: string,
  body: any
): Promise<InverterType> {
  await connectDB();

  const dbUser = await User.findById(userId).lean();
  const existing = await Inverter.findOne({ inverterId });
  if (!existing) throw new Error("NOT_FOUND");

  const isOwner = existing.ownerId?.toString() === userId;
  const isAdmin = dbUser?.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

  // Map frontend field names → DB field names
  const allowedUpdates: Record<string, any> = {};
  const fieldMap: Record<string, string> = { model: "inverterModel" };
  const updatableFields = [
    "name", "location", "status", "performanceRatio", "riskScore", "uptime",
    "model", "capacity", "installDate", "firmware", "efficiency",
    "inverterPower", "inverterPv1Power", "inverterPv1Voltage", "inverterPv1Current",
    "inverterPv2Power", "inverterPv2Voltage", "inverterPv2Current",
    "inverterKwhToday", "inverterKwhTotal", "inverterTemp",
    "inverterOpState", "inverterAlarmCode", "inverterLimitPercent",
    "ambientTemp", "meterActivePower",
  ];
  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      const dbField = fieldMap[field] || field;
      allowedUpdates[dbField] = body[field];
    }
  }
  if (body.installDate) allowedUpdates.installDate = new Date(body.installDate);
  if (body.strings) {
    allowedUpdates.strings = (body.strings as any[]).map((s) => ({
      stringId: s.id,
      voltage: s.voltage,
      current: s.current,
      power: s.power,
      status: s.status,
    }));
  }
  allowedUpdates.lastUpdated = new Date();

  const updated = await Inverter.findOneAndUpdate(
    { inverterId },
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) throw new Error("NOT_FOUND");
  logger.info("Inverter updated", { inverterId, userId });
  return mapToFrontend(updated);
}

/** Delete an inverter and its telemetry (admin only) */
export async function deleteInverter(
  inverterId: string,
  userId: string
): Promise<void> {
  await connectDB();

  const dbUser = await User.findById(userId).lean();
  if (!dbUser || dbUser.role !== "admin") throw new Error("FORBIDDEN");

  const deleted = await Inverter.findOneAndDelete({ inverterId });
  if (!deleted) throw new Error("NOT_FOUND");

  // Also remove associated telemetry
  const { TelemetryRecord } = await import("@/backend/models");
  await TelemetryRecord.deleteMany({ inverterId });

  logger.info("Inverter deleted", { inverterId, userId });
}

export { mapToFrontend };
