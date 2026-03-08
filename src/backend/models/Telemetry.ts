/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Telemetry Record Model (Mongoose)
 * ─────────────────────────────────────────────────────────
 * Time-series telemetry data linked to an inverter.
 * Field names align with master_refined.csv columns.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ITelemetryRecord extends Document {
  inverterId: string;
  plantId: string;
  timestamp: Date;

  /* ── Raw sensor data (matches CSV columns) ── */
  inverterPower: number;       // AC power output (W)
  inverterPv1Power: number;    // PV string 1 power (W)
  inverterPv1Voltage: number;  // PV string 1 voltage (V)
  inverterPv1Current: number;  // PV string 1 current (A)
  inverterPv2Power: number;    // PV string 2 power (W)
  inverterPv2Voltage: number;  // PV string 2 voltage (V)
  inverterPv2Current: number;  // PV string 2 current (A)
  inverterKwhToday: number;    // Daily energy yield (kWh)
  inverterKwhTotal: number;    // Lifetime energy yield (kWh)
  inverterTemp: number;        // Inverter temperature (C)
  inverterOpState: number;     // Operating state code
  inverterAlarmCode: number;   // Alarm code
  inverterLimitPercent: number;// Power limit percentage
  ambientTemp: number;         // Ambient temperature (C)
  meterActivePower: number;    // Grid meter active power (kW)

  createdAt: Date;
}

const TelemetryRecordSchema = new Schema<ITelemetryRecord>(
  {
    inverterId: { type: String, required: true, index: true },
    plantId: { type: String, default: "" },
    timestamp: { type: Date, required: true },

    inverterPower: { type: Number, default: 0 },
    inverterPv1Power: { type: Number, default: 0 },
    inverterPv1Voltage: { type: Number, default: 0 },
    inverterPv1Current: { type: Number, default: 0 },
    inverterPv2Power: { type: Number, default: 0 },
    inverterPv2Voltage: { type: Number, default: 0 },
    inverterPv2Current: { type: Number, default: 0 },
    inverterKwhToday: { type: Number, default: 0 },
    inverterKwhTotal: { type: Number, default: 0 },
    inverterTemp: { type: Number, default: 0 },
    inverterOpState: { type: Number, default: 0 },
    inverterAlarmCode: { type: Number, default: 0 },
    inverterLimitPercent: { type: Number, default: 0 },
    ambientTemp: { type: Number, default: 0 },
    meterActivePower: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TelemetryRecordSchema.index({ inverterId: 1, timestamp: -1 });
TelemetryRecordSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const TelemetryRecord: Model<ITelemetryRecord> =
  mongoose.models.TelemetryRecord ||
  mongoose.model<ITelemetryRecord>("TelemetryRecord", TelemetryRecordSchema);
