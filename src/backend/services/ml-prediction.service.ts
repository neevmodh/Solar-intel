/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: ML Prediction Service (v5)
 * ─────────────────────────────────────────────────────────
 * 2-tier ML prediction strategy:
 *
 *   Tier 1: POST /predict/fleet  (best — Python pulls telemetry
 *           from MongoDB, runs full training pipeline, proper
 *           lag/rolling features). Requires MONGODB_URI on ML host.
 *
 *   Tier 2: POST /predict/batch  (fallback — Next.js maps inverter
 *           documents to 22 snapshot features and sends them
 *           directly. Less accurate but works without MongoDB
 *           access on the ML service side).
 *
 * This ensures ML predictions work on Vercel+Render even when
 * the Render ML service doesn't have MongoDB access.
 * ─────────────────────────────────────────────────────────
 */

import { env } from "@/backend/config/env";
import logger from "@/backend/utils/logger";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ShapExplanation {
  feature: string;           // Raw feature name (e.g., "inverter_temp")
  label: string;             // Human-readable label (e.g., "Inverter temperature")
  value: string | null;      // Formatted value (e.g., "64.5°C", "250kW")
  contribution: number;      // Percentage contribution (0-100)
  direction: "positive" | "negative";  // Increases or decreases failure risk
  impact: "high" | "medium" | "low";   // Impact magnitude
  description: string;       // Full human-readable explanation
}

export interface MLPrediction {
  inverter_id: string;
  plant_id: string;
  risk_score: number;       // 0.0 – 1.0
  risk_level: string;       // "low" | "medium" | "high" | "critical"
  failure_predicted: boolean;
  status: string;
  top_factors: string[];
  shap_explanation?: ShapExplanation[];
  recommended_action: string;
}

interface MLBatchResponse {
  predictions: MLPrediction[];
  timestamp: string;
  model_version: string;
}

// ─────────────────────────────────────────────────────────
// Tier 2 helper: Map a DB inverter doc → ML snapshot features
// ─────────────────────────────────────────────────────────

function inverterToMLInput(inv: any) {
  const hour = new Date().getHours();
  return {
    plant_id: inv.plantId || "Plant_1",
    inverter_id: inv.inverterId || "Unknown",
    mean_power: inv.inverterPower || 0,
    std_power: (inv.inverterPower || 0) * 0.08,
    max_power: (inv.inverterPower || 0) * 1.15,
    min_power: (inv.inverterPower || 0) * 0.85,
    mean_temp: inv.inverterTemp || 35,
    max_temp: (inv.inverterTemp || 35) + 5,
    mean_voltage: inv.inverterPv1Voltage || 600,
    mean_current: inv.inverterPv1Current || 10,
    ambient_temp: inv.ambientTemp || Math.max((inv.inverterTemp || 35) - 15, 25),
    alarm_count: inv.inverterAlarmCode || 0,
    hour,
    grid_freq: 50.0,
    power_factor: 0.98,
    kwh_today: inv.inverterKwhToday || 0,
    kwh_total: inv.inverterKwhTotal || 500000,
    op_state: inv.inverterOpState ?? (inv.inverterPower > 0 ? 5120 : 0),
    n_strings: (inv.strings || []).length || 2,
    current_imbalance: 0.05,
    voltage_imbalance: 0.01,
    power_ramp: 0,
  };
}

// ─────────────────────────────────────────────────────────
// Tier 1: /predict/fleet (MongoDB-backed, full pipeline)
// ─────────────────────────────────────────────────────────

async function tryFleetPrediction(mlUrl: string, inverterIds: string[]): Promise<MLBatchResponse | null> {
  try {
    const res = await fetch(`${mlUrl}/predict/fleet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inverter_ids: inverterIds }),
      signal: AbortSignal.timeout(env.ML_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      logger.warn("ML fleet endpoint failed — will try batch fallback", {
        status: res.status,
        body: errBody.slice(0, 200),
      });
      return null;
    }

    const data: MLBatchResponse = await res.json();
    logger.info("ML fleet predictions received (Tier 1)", {
      count: data.predictions.length,
      model: data.model_version,
    });
    return data;
  } catch (err) {
    logger.warn("ML fleet endpoint unreachable — will try batch fallback", {
      error: (err as Error).message,
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Tier 2: /predict/batch (snapshot features, no MongoDB)
// ─────────────────────────────────────────────────────────

async function tryBatchPrediction(mlUrl: string, dbInverters: any[]): Promise<MLBatchResponse | null> {
  try {
    const inverters = dbInverters.map(inverterToMLInput);

    const res = await fetch(`${mlUrl}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inverters }),
      signal: AbortSignal.timeout(env.ML_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      logger.error("ML batch endpoint also failed", {
        status: res.status,
        body: errBody.slice(0, 200),
      });
      return null;
    }

    const data: MLBatchResponse = await res.json();
    logger.info("ML batch predictions received (Tier 2 fallback)", {
      count: data.predictions.length,
      model: data.model_version,
    });
    return data;
  } catch (err) {
    logger.error("ML batch endpoint unreachable", {
      error: (err as Error).message,
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Public API: 2-tier prediction with automatic fallback
// ─────────────────────────────────────────────────────────

export async function getMLPredictions(dbInverters: any[]): Promise<MLPrediction[] | null> {
  const mlUrl = env.ML_SERVICE_URL.replace("/predict", "");

  const inverterIds = dbInverters.map((inv) => inv.inverterId).filter(Boolean);
  if (inverterIds.length === 0) {
    logger.warn("No inverter IDs to send to ML service");
    return null;
  }

  // Tier 1: Full pipeline (fleet endpoint — needs MongoDB on ML host)
  const fleetResult = await tryFleetPrediction(mlUrl, inverterIds);
  if (fleetResult && fleetResult.predictions.length > 0) {
    logPredictionRange(fleetResult.predictions, "fleet");
    return fleetResult.predictions;
  }

  // Tier 2: Snapshot-based (batch endpoint — no MongoDB needed)
  const batchResult = await tryBatchPrediction(mlUrl, dbInverters);
  if (batchResult && batchResult.predictions.length > 0) {
    logPredictionRange(batchResult.predictions, "batch");
    return batchResult.predictions;
  }

  logger.error("Both ML prediction tiers failed", { mlUrl, inverterCount: inverterIds.length });
  return null;
}

function logPredictionRange(predictions: MLPrediction[], tier: string) {
  const scores = predictions.map((p) => p.risk_score);
  logger.info(`ML predictions via ${tier}`, {
    count: predictions.length,
    riskRange: `${Math.min(...scores).toFixed(4)}–${Math.max(...scores).toFixed(4)}`,
  });
}

/**
 * Get a single inverter prediction (tries fleet then batch).
 */
export async function getMLPredictionSingle(inv: any): Promise<MLPrediction | null> {
  const preds = await getMLPredictions([inv]);
  return preds && preds.length > 0 ? preds[0] : null;
}
