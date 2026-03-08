/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Telemetry Service
 * ─────────────────────────────────────────────────────────
 * Telemetry queries + bulk ingestion logic.
 */

import { connectDB } from "@/backend/config";
import { TelemetryRecord } from "@/backend/models";
import logger from "@/backend/utils/logger";

/** Get telemetry for an inverter (last N days) */
export async function getInverterTelemetry(
  inverterId: string,
  days: number
): Promise<{
  inverterId: string;
  period: string;
  count: number;
  records: Record<string, unknown>[];
}> {
  await connectDB();

  const clampedDays = Math.min(Math.max(days, 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - clampedDays);

  const records = await TelemetryRecord.find({
    inverterId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .limit(clampedDays * 24)
    .lean();

  const mapped = records.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    inverterPower: r.inverterPower,
    inverterPv1Power: r.inverterPv1Power,
    inverterPv1Voltage: r.inverterPv1Voltage,
    inverterPv1Current: r.inverterPv1Current,
    inverterPv2Power: r.inverterPv2Power,
    inverterPv2Voltage: r.inverterPv2Voltage,
    inverterPv2Current: r.inverterPv2Current,
    inverterKwhToday: r.inverterKwhToday,
    inverterKwhTotal: r.inverterKwhTotal,
    inverterTemp: r.inverterTemp,
    inverterOpState: r.inverterOpState,
    inverterAlarmCode: r.inverterAlarmCode,
    inverterLimitPercent: r.inverterLimitPercent,
    ambientTemp: r.ambientTemp,
    meterActivePower: r.meterActivePower,
  }));

  logger.info("Telemetry fetched", { inverterId, records: mapped.length, days: clampedDays });

  return {
    inverterId,
    period: `${clampedDays} days`,
    count: mapped.length,
    records: mapped,
  };
}

/** Bulk ingest telemetry records */
export async function ingestTelemetry(
  records: Record<string, unknown>[]
): Promise<{ inserted: number }> {
  await connectDB();

  const docs = records.map((r) => ({
    inverterId: r.inverterId,
    plantId: r.plantId || "",
    timestamp: new Date(r.timestamp as string),
    inverterPower: r.inverterPower || 0,
    inverterPv1Power: r.inverterPv1Power || 0,
    inverterPv1Voltage: r.inverterPv1Voltage || 0,
    inverterPv1Current: r.inverterPv1Current || 0,
    inverterPv2Power: r.inverterPv2Power || 0,
    inverterPv2Voltage: r.inverterPv2Voltage || 0,
    inverterPv2Current: r.inverterPv2Current || 0,
    inverterKwhToday: r.inverterKwhToday || 0,
    inverterKwhTotal: r.inverterKwhTotal || 0,
    inverterTemp: r.inverterTemp || 0,
    inverterOpState: r.inverterOpState || 0,
    inverterAlarmCode: r.inverterAlarmCode || 0,
    inverterLimitPercent: r.inverterLimitPercent || 0,
    ambientTemp: r.ambientTemp || 0,
    meterActivePower: r.meterActivePower || 0,
  }));

  const result = await TelemetryRecord.insertMany(docs, { ordered: false });

  logger.info("Telemetry ingested", { inserted: result.length, total: docs.length });
  return { inserted: result.length };
}
