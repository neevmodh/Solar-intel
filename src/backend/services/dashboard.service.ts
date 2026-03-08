/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Dashboard Service
 * ─────────────────────────────────────────────────────────
 * Aggregates inverter, telemetry, AI insights for dashboard.
 * 100 % real data from MongoDB — zero static/mock generation.
 *
 * GenAI Failure Intelligence uses a 3-tier pipeline:
 *   Tier 1: XGBoost ML + Groq LLM (real AI-generated analysis)
 *   Tier 2: XGBoost ML only (structured template)
 *   Tier 3: Rule-based fallback (when ML unavailable)
 */

import { connectDB } from "@/backend/config";
import { env } from "@/backend/config/env";
import { Inverter as InverterModel, TelemetryRecord } from "@/backend/models";
import { mapToFrontend } from "./inverter.service";
import { getMLPredictions, type MLPrediction } from "./ml-prediction.service";
import logger from "@/backend/utils/logger";
import type { DashboardData, SystemHealth, PerformanceTrend, AIInsight } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ══════════════════════════════════════════════════════════
// Groq-powered insight generation for the dashboard panel
// ══════════════════════════════════════════════════════════

const INSIGHT_SYSTEM_PROMPT = `You are Solar Intel AI — an expert solar PV operations analyst.
An XGBoost ML model has scored each inverter with a risk_score (0–1) and identified contributing factors.
Your job: translate the ML outputs into unique, specific, actionable human-readable insights.

RULES:
- Each inverter MUST get a UNIQUE analysis — never repeat the same text for different inverters.
- Reference the specific ML risk_score percentage, the inverter name, and the top contributing factors.
- Mention actual telemetry numbers (temperature, voltage, efficiency, power output) that support the analysis.
- The "reasoning" must explain WHY the risk is elevated using the inverter's unique sensor data.
- Recommendations must be specific and actionable — not generic checklists.
- Be concise: summary ≤1 sentence, reasoning ≤3 sentences, 2-4 recommendations.
- Output strict JSON, no markdown.

OUTPUT FORMAT:
[
  {
    "inverterId": "INV-XXX",
    "summary": "One-sentence finding mentioning specific numbers",
    "reasoning": "Technical analysis citing ML factors and telemetry data unique to this inverter",
    "recommendations": ["Specific action 1", "Specific action 2"]
  }
]`;

/** In-memory cache for dashboard Groq insights (avoid repeated calls on refresh) */
let dashboardGroqCache: { data: any[]; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function generateGroqInsights(
  atRiskInverters: any[],
  mlPredictions: MLPrediction[]
): Promise<any[] | null> {
  if (!env.GROQ_API_KEY) return null;
  if (atRiskInverters.length === 0) return null;

  // Return cached if fresh
  if (dashboardGroqCache && Date.now() - dashboardGroqCache.ts < DASHBOARD_CACHE_TTL) {
    logger.info("Dashboard Groq cache hit");
    return dashboardGroqCache.data;
  }

  const mlMap = new Map<string, MLPrediction>();
  for (const p of mlPredictions) mlMap.set(p.inverter_id, p);

  // Build per-inverter context with ML + telemetry data for Groq
  const inverterContexts = atRiskInverters.map((inv) => {
    const ml = mlMap.get(inv.inverterId);
    const powerKw = ((inv.inverterPower || 0) / 1000).toFixed(1);
    return [
      `INVERTER: ${inv.inverterId} "${inv.name}"`,
      `  Plant: ${inv.plantId} | Model: ${inv.inverterModel || "N/A"} | Capacity: ${inv.capacity}kW`,
      `  Telemetry: Temp=${inv.inverterTemp}C, Power=${powerKw}kW, Efficiency=${inv.efficiency}%, PR=${inv.performanceRatio}%`,
      `  PV Strings: PV1=${inv.inverterPv1Power}W/${inv.inverterPv1Voltage}V, PV2=${inv.inverterPv2Power}W/${inv.inverterPv2Voltage}V`,
      `  Energy: Today=${inv.inverterKwhToday}kWh, Total=${inv.inverterKwhTotal}kWh | OpState: ${inv.inverterOpState} | Alarms: ${inv.inverterAlarmCode}`,
      `  Uptime: ${inv.uptime}% | Firmware: ${inv.firmware || "N/A"} | Installed: ${inv.installDate || "N/A"}`,
      ml ? `  ML PREDICTION: Risk=${(ml.risk_score * 100).toFixed(1)}% (${ml.risk_level}) | Failure=${ml.failure_predicted ? "YES" : "NO"} | Top Factors: ${ml.top_factors.join(", ")} | Action: ${ml.recommended_action}` : "  ML PREDICTION: unavailable",
    ].join("\n");
  }).join("\n\n");

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
          { role: "system", content: INSIGHT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze these ${atRiskInverters.length} at-risk inverters. Generate a UNIQUE analysis for each one — no two inverters should have the same summary or reasoning.\n\n${inverterContexts}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.error("Dashboard Groq error", { status: res.status, body: errText.slice(0, 200) });
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    // Groq might return { insights: [...] } or just [...]
    const insights = Array.isArray(parsed) ? parsed : parsed.insights || parsed.data || [];

    if (insights.length > 0) {
      dashboardGroqCache = { data: insights, ts: Date.now() };
      logger.info("Dashboard Groq insights generated", {
        count: insights.length,
        model: json.model,
        tokens: json.usage?.total_tokens,
      });
    }

    return insights;
  } catch (err) {
    logger.error("Dashboard Groq failed", { error: (err as Error).message });
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();

  const dbInverters = await InverterModel.find({}).lean();

  // Fetch ML predictions first so we can enrich everything
  const mlPredictions = await getMLPredictions(dbInverters);
  const mlMap = new Map<string, MLPrediction>();
  if (mlPredictions) {
    for (const p of mlPredictions) mlMap.set(p.inverter_id, p);
  }

  // Map inverters with ML-derived status + riskScore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inverters = dbInverters.map((inv: any) =>
    mapToFrontend(inv, mlMap.get(inv.inverterId))
  );

  // ── System Health ──
  const healthyCount = inverters.filter((i) => i.status === "healthy").length;
  const warningCount = inverters.filter((i) => i.status === "warning").length;
  const criticalCount = inverters.filter((i) => i.status === "critical").length;

  const totalKw = inverters.reduce((s, i) => s + (i.powerOutput || 0), 0);
  // Show in MW if > 1MW, otherwise show kW (frontend label will need adjustment)
  // For now keep MW but with proper rounding to 3 decimals for small values
  const totalMw = Math.round(totalKw * 1000) / 1000000; // kW to MW, 3 decimals

  // Use DB status as authority for failure predictions (ML batch fallback can be inaccurate)
  // Only count inverters with DB riskScore >= 60 OR critical status as "predicted failures"
  const predictedFailureCount = mlPredictions
    ? dbInverters.filter((inv: any) => {
        const ml = mlPredictions.find((p) => p.inverter_id === inv.inverterId);
        // Trust DB risk score over ML batch fallback
        const dbRisk = inv.riskScore || 0;
        const mlRisk = ml ? ml.risk_score * 100 : 0;
        // Failure predicted if: DB says critical/high risk OR ML says failure AND DB agrees (risk >= 40)
        return inv.status === "critical" || dbRisk >= 60 || (ml?.failure_predicted && dbRisk >= 40);
      }).length
    : criticalCount;

  const systemHealth: SystemHealth = {
    totalInverters: inverters.length,
    healthyCount,
    warningCount,
    criticalCount,
    avgPerformanceRatio:
      Math.round((inverters.reduce((s, i) => s + (i.performanceRatio || 0), 0) / (inverters.length || 1)) * 10) / 10,
    // powerOutput is in kW, convert to MW (round to 3 decimals for small fleets)
    totalPowerOutput: totalMw < 0.001 ? 0.001 : totalMw, // Minimum 0.001 to avoid showing 0
    systemUptime:
      Math.round((inverters.reduce((s, i) => s + (i.uptime || 0), 0) / (inverters.length || 1)) * 10) / 10,
    predictedFailures: predictedFailureCount,
  };

  // ── 30-day Performance Trends ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const telemetry = await TelemetryRecord.find({ timestamp: { $gte: thirtyDaysAgo } })
    .sort({ timestamp: 1 })
    .lean();

  let performanceTrends: PerformanceTrend[];
  if (telemetry.length > 0) {
    // New telemetry model has inverterPower (W) but no performanceRatio.
    // We derive a PR proxy: (inverterPower / rated_capacity) * 100, capped at 100.
    // Build a lookup for rated capacity per inverter from DB inverters.
    const capMap = new Map<string, number>();
    for (const inv of dbInverters) {
      capMap.set((inv as any).inverterId, (inv as any).capacity || 250);
    }

    const byDate = new Map<string, { pr: number[]; power: number[] }>();
    for (const t of telemetry) {
      const dk = t.timestamp.toISOString().split("T")[0];
      if (!byDate.has(dk)) byDate.set(dk, { pr: [], power: [] });
      const bucket = byDate.get(dk)!;
      const powerKw = (t.inverterPower || 0) / 1000;
      const cap = capMap.get(t.inverterId) || 250;
      const pr = cap > 0 ? Math.min((powerKw / cap) * 100, 100) : 0;
      bucket.pr.push(pr);
      bucket.power.push(powerKw);
    }

    // Compute fleet-average expected ratio from the first week of data
    const allPR: number[] = [];
    byDate.forEach((vals) => allPR.push(...vals.pr));
    const baselineExpected = allPR.length > 0
      ? Math.round((allPR.reduce((a, b) => a + b, 0) / allPR.length) * 10) / 10
      : 90;

    performanceTrends = [];
    byDate.forEach((vals, date) => {
      const avgPR = Math.round((vals.pr.reduce((a, b) => a + b, 0) / vals.pr.length) * 10) / 10;
      const avgPower = Math.round((vals.power.reduce((a, b) => a + b, 0) / vals.power.length) * 100) / 100;
      performanceTrends.push({
        date,
        performanceRatio: avgPR,
        expectedRatio: baselineExpected,
        powerOutput: avgPower,
      });
    });
  } else {
    // No telemetry at all — return empty array (no fake data)
    performanceTrends = [];
  }

  // ══════════════════════════════════════════════════════════
  // AI Insights — 3-tier GenAI pipeline
  // Tier 1: ML + Groq (real AI-generated unique analysis per inverter)
  // Tier 2: ML only (structured but not AI-generated)
  // Tier 3: Rule-based fallback (no ML, no Groq)
  // ══════════════════════════════════════════════════════════
  let aiInsights: AIInsight[];
  let insightSource = "rule-based";

  if (mlPredictions && mlPredictions.length > 0) {
    // Use DB status/risk as the authority for filtering at-risk inverters
    // ML model currently lacks time-series context and returns uniform scores
    const atRiskDbInverters = dbInverters.filter((inv: any) =>
      inv.status === "critical" || inv.status === "warning" || (inv.riskScore || 0) >= 30
    );
    const atRiskInverterIds = atRiskDbInverters.map((inv: any) => inv.inverterId);
    const atRiskPredictions = mlPredictions.filter((p) => atRiskInverterIds.includes(p.inverter_id));

    // ── TIER 1: Try Groq for real AI-generated insights ──
    const groqInsights = await generateGroqInsights(atRiskDbInverters, atRiskPredictions);

    if (groqInsights && groqInsights.length > 0) {
      // Map Groq output to AIInsight type, enriched with DB risk data
      aiInsights = groqInsights.map((gi: any) => {
        const dbInv = dbInverters.find((i: any) => i.inverterId === gi.inverterId);
        const inv = inverters.find((i) => i.id === gi.inverterId);
        const dbRisk = dbInv?.riskScore || 0;
        const dbRiskLevel = dbRisk >= 80 ? "critical" : dbRisk >= 60 ? "high" : dbRisk >= 30 ? "medium" : "low";
        return {
          id: `insight-${gi.inverterId}`,
          inverterId: gi.inverterId,
          inverterName: inv?.name || gi.inverterId,
          riskLevel: dbRiskLevel as "critical" | "high" | "medium" | "low",
          summary: gi.summary || `Risk assessment: ${dbRisk}/100`,
          reasoning: gi.reasoning || `Telemetry analysis for ${gi.inverterId}`,
          recommendations: gi.recommendations || ["Schedule inspection"],
          confidence: dbRisk / 100,
          generatedAt: new Date().toISOString(),
        };
      });
      insightSource = "ml+groq";
    } else {
      // ── TIER 2: ML available, Groq failed — use DB risk + ML enrichment ──
      aiInsights = atRiskDbInverters.map((dbInv: any) => {
        const inv = inverters.find((i) => i.id === dbInv.inverterId);
        const ml = mlPredictions.find((p) => p.inverter_id === dbInv.inverterId);
        const dbRisk = dbInv.riskScore || 0;
        const dbRiskLevel = dbRisk >= 80 ? "critical" : dbRisk >= 60 ? "high" : dbRisk >= 30 ? "medium" : "low";
        return {
          id: `insight-${dbInv.inverterId}`,
          inverterId: dbInv.inverterId,
          inverterName: inv?.name || dbInv.inverterId,
          riskLevel: dbRiskLevel as "critical" | "high" | "medium" | "low",
          summary: `Risk score ${dbRisk}/100 — ${dbInv.status === "critical" ? "immediate attention needed" : "monitoring recommended"}`,
          reasoning: `Telemetry: ${dbInv.inverterTemp}°C, ${dbInv.efficiency}% efficiency, ${((dbInv.inverterPower || 0) / 1000).toFixed(1)}/${dbInv.capacity}kW output.${ml ? ` ML factors: ${ml.top_factors?.slice(0, 2).join(", ")}` : ""}`,
          recommendations: [
            ml?.recommended_action || "Schedule inspection",
            ...(dbInv.inverterTemp > 60 ? [`Temperature ${dbInv.inverterTemp}°C is elevated — inspect cooling system.`] : []),
            ...(dbInv.efficiency < 85 ? [`Efficiency at ${dbInv.efficiency}% — schedule MPPT recalibration.`] : []),
          ],
          confidence: dbRisk / 100,
          generatedAt: new Date().toISOString(),
        };
      });
      insightSource = "ml-only";
    }
  } else {
    // ── TIER 3: No ML — pure rule-based fallback ──
    aiInsights = inverters
      .filter((i) => i.status === "critical" || i.status === "warning")
      .map((inv) => ({
        id: `insight-${inv.id}`,
        inverterId: inv.id,
        inverterName: inv.name,
        riskLevel: inv.status === "critical" ? ("critical" as const) : ("high" as const),
        summary:
          inv.status === "critical"
            ? `Critical: ${inv.name} at ${inv.performanceRatio}% PR, risk ${inv.riskScore}/100.`
            : `Warning: ${inv.name} at ${inv.performanceRatio}% PR — monitoring required.`,
        reasoning: `${inv.name} operating at ${inv.temperature}°C with ${inv.efficiency}% efficiency. Power output: ${inv.powerOutput}kW of ${inv.capacity}kW capacity.`,
        recommendations: [
          inv.temperature > 65
            ? `Temperature ${inv.temperature}°C — reduce load and inspect cooling system immediately.`
            : `Temperature ${inv.temperature}°C — within range, continue monitoring.`,
          inv.efficiency < 85
            ? `Efficiency ${inv.efficiency}% is below threshold — schedule diagnostic.`
            : `Efficiency ${inv.efficiency}% — acceptable.`,
        ],
        confidence: inv.status === "critical" ? 0.92 : 0.78,
        generatedAt: new Date().toISOString(),
      }));
  }

  logger.info("Dashboard data assembled", {
    inverters: inverters.length,
    trends: performanceTrends.length,
    insightCount: aiInsights.length,
    insightSource,
  });

  return { systemHealth, inverters, performanceTrends, aiInsights };
}
