/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: ML Analysis Service
 * ─────────────────────────────────────────────────────────
 * Proxies to Python ML microservice, falls back to
 * rule-based risk engine when ML is unavailable.
 */

import axios, { AxiosError } from "axios";
import { connectDB, env } from "@/backend/config";
import { Inverter, TelemetryRecord } from "@/backend/models";
import logger from "@/backend/utils/logger";

/* ── Rule-based fallback ── */

function fallbackRiskAnalysis(inverter: {
  inverterTemp: number;
  efficiency: number;
  performanceRatio: number;
  inverterPv1Voltage: number;
  inverterAlarmCode: number;
}) {
  let risk = 0;
  const factors: string[] = [];

  if (inverter.inverterTemp > 70) {
    risk += 35;
    factors.push(`CRITICAL: Junction temperature at ${inverter.inverterTemp}°C exceeds safe limits (>70°C).`);
  } else if (inverter.inverterTemp > 55) {
    risk += 15;
    factors.push(`WARNING: Elevated temperature at ${inverter.inverterTemp}°C approaching threshold.`);
  }

  if (inverter.efficiency < 80) {
    risk += 30;
    factors.push(`CRITICAL: Conversion efficiency at ${inverter.efficiency}% indicates component degradation.`);
  } else if (inverter.efficiency < 90) {
    risk += 12;
    factors.push(`WARNING: Efficiency dip to ${inverter.efficiency}%.`);
  }

  if (inverter.performanceRatio < 60) {
    risk += 25;
    factors.push(`CRITICAL: Performance ratio at ${inverter.performanceRatio}% — major output loss.`);
  } else if (inverter.performanceRatio < 80) {
    risk += 10;
    factors.push(`WARNING: Performance ratio below optimal at ${inverter.performanceRatio}%.`);
  }

  if (inverter.inverterPv1Voltage < 100 || inverter.inverterPv1Voltage > 700) {
    risk += 15;
    factors.push(`PV1 voltage at ${inverter.inverterPv1Voltage}V outside normal range (100-700V).`);
  }

  if (inverter.inverterAlarmCode > 0) {
    risk += 10;
    factors.push(`Active alarm code: ${inverter.inverterAlarmCode}.`);
  }

  const clamped = Math.min(risk, 100);

  const recs: string[] = [];
  if (clamped >= 70) {
    recs.push("Schedule immediate on-site inspection within 24 hours.");
    recs.push("Reduce load to 60% of rated capacity.");
    recs.push("Enable continuous telemetry at 1-minute intervals.");
  } else if (clamped >= 40) {
    recs.push("Schedule preventive maintenance within 1 week.");
    recs.push("Increase monitoring to 5-minute intervals.");
  } else if (clamped >= 20) {
    recs.push("Add to next scheduled maintenance window.");
  }
  if (factors.some((f) => f.includes("temperature"))) {
    recs.push("Inspect cooling system — fans, heat sinks, thermal paste.");
  }
  if (factors.some((f) => f.includes("efficiency"))) {
    recs.push("Run full I-V curve trace to identify degradation.");
  }

  return {
    riskScore: clamped,
    riskLevel: clamped >= 70 ? "critical" : clamped >= 40 ? "high" : clamped >= 20 ? "medium" : "low",
    summary: factors.length > 0
      ? `Analysis identified ${factors.length} risk factor(s). Primary concern: ${factors[0]}`
      : "All parameters within normal operating range.",
    factors,
    confidence: 0.78,
    model: "rule-based-fallback-v1",
    recommendations: recs,
  };
}

/* ── Main analysis function ── */

export async function analyzeInverter(inverterId: string) {
  await connectDB();

  const inverter = await Inverter.findOne({ inverterId }).lean();
  if (!inverter) throw new Error("NOT_FOUND");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const telemetry = await TelemetryRecord.find({
    inverterId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .limit(720)
    .lean();

  logger.info("Analysis requested", { inverterId, telemetryRecords: telemetry.length });

  // Build ML payload
  const mlPayload = {
    inverter_id: inverter.inverterId,
    inverter_model: inverter.inverterModel,
    capacity_kw: inverter.capacity,
    install_date: inverter.installDate?.toISOString(),
    current_state: {
      temperature: inverter.inverterTemp,
      pv1_voltage: inverter.inverterPv1Voltage,
      pv1_current: inverter.inverterPv1Current,
      pv2_voltage: inverter.inverterPv2Voltage,
      pv2_current: inverter.inverterPv2Current,
      power_output: inverter.inverterPower,
      efficiency: inverter.efficiency,
      performance_ratio: inverter.performanceRatio,
      kwh_today: inverter.inverterKwhToday,
      kwh_total: inverter.inverterKwhTotal,
      op_state: inverter.inverterOpState,
      alarm_code: inverter.inverterAlarmCode,
      ambient_temp: inverter.ambientTemp,
      meter_active_power: inverter.meterActivePower,
    },
    telemetry_history: telemetry.map((t) => ({
      timestamp: t.timestamp.toISOString(),
      inverter_power: t.inverterPower,
      pv1_voltage: t.inverterPv1Voltage,
      pv1_current: t.inverterPv1Current,
      temperature: t.inverterTemp,
      kwh_today: t.inverterKwhToday,
      ambient_temp: t.ambientTemp,
      alarm_code: t.inverterAlarmCode,
    })),
  };

  // Try ML service first
  try {
    const mlResponse = await axios.post(env.ML_SERVICE_URL, mlPayload, {
      timeout: env.ML_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });

    logger.info("ML analysis complete", { inverterId, riskScore: mlResponse.data.riskScore });

    return {
      inverterId,
      inverterName: inverter.name,
      analysis: { ...mlResponse.data, model: "neural-predictor-v2", source: "ml-service" },
      telemetryRecordsAnalyzed: telemetry.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const axiosErr = err as AxiosError;
    logger.warn("ML service unavailable, using fallback", {
      inverterId,
      error: axiosErr.message,
    });

    const analysis = fallbackRiskAnalysis({
      inverterTemp: inverter.inverterTemp,
      efficiency: inverter.efficiency,
      performanceRatio: inverter.performanceRatio,
      inverterPv1Voltage: inverter.inverterPv1Voltage,
      inverterAlarmCode: inverter.inverterAlarmCode,
    });

    return {
      inverterId,
      inverterName: inverter.name,
      analysis: { ...analysis, source: "rule-based-fallback" },
      telemetryRecordsAnalyzed: telemetry.length,
      timestamp: new Date().toISOString(),
    };
  }
}
