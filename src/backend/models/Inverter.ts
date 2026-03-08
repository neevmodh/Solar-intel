/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Inverter Model (Mongoose)
 * ─────────────────────────────────────────────────────────
 * Stores inverter fleet metadata + real-time state.
 * Field names align with the training dataset (master_refined.csv).
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IInverterString {
  stringId: string;
  voltage: number;
  current: number;
  power: number;
  status: "healthy" | "warning" | "critical";
}

export interface IInverter extends Document {
  inverterId: string;        // e.g. "INV-001" (unique across system)
  plantId: string;           // e.g. "Plant 1"
  name: string;              // display name
  location: string;          // human-readable location
  status: "healthy" | "warning" | "critical";

  /* ── Real telemetry fields (match CSV / ML model inputs) ── */
  inverterPower: number;     // AC power output (W)
  inverterPv1Power: number;  // PV string 1 power (W)
  inverterPv1Voltage: number;// PV string 1 voltage (V)
  inverterPv1Current: number;// PV string 1 current (A)
  inverterPv2Power: number;  // PV string 2 power (W)
  inverterPv2Voltage: number;// PV string 2 voltage (V)
  inverterPv2Current: number;// PV string 2 current (A)
  inverterKwhToday: number;  // Daily energy yield (kWh)
  inverterKwhTotal: number;  // Lifetime energy yield (kWh)
  inverterTemp: number;      // Inverter temperature (C)
  inverterOpState: number;   // Operating state code
  inverterAlarmCode: number; // Alarm code
  inverterLimitPercent: number; // Power limit percentage
  ambientTemp: number;       // Ambient temperature (C)
  meterActivePower: number;  // Grid meter active power (kW)

  /* ── Derived / display fields ── */
  riskScore: number;         // 0-100 from ML model
  lastUpdated: Date;
  uptime: number;            // 0-100 percent
  inverterModel: string;     // e.g. "SolarEdge SE250K"
  capacity: number;          // rated capacity kW
  installDate: Date;
  firmware: string;

  /* ── Legacy compatibility (computed at read time) ── */
  performanceRatio: number;
  efficiency: number;

  strings: IInverterString[];
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InverterStringSchema = new Schema<IInverterString>(
  {
    stringId: { type: String, required: true },
    voltage: { type: Number, required: true },
    current: { type: Number, required: true },
    power: { type: Number, required: true },
    status: { type: String, enum: ["healthy", "warning", "critical"], default: "healthy" },
  },
  { _id: false }
);

const InverterSchema = new Schema<IInverter>(
  {
    inverterId: { type: String, required: true, unique: true, index: true },
    plantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    status: { type: String, enum: ["healthy", "warning", "critical"], default: "healthy" },

    /* ── Real telemetry fields ── */
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

    /* ── Derived / display ── */
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: { type: Date, default: Date.now },
    uptime: { type: Number, default: 100, min: 0, max: 100 },
    inverterModel: { type: String, default: "Unknown" },
    capacity: { type: Number, default: 250 },
    installDate: { type: Date, default: Date.now },
    firmware: { type: String, default: "" },

    performanceRatio: { type: Number, default: 0 },
    efficiency: { type: Number, default: 0 },

    strings: [InverterStringSchema],
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

InverterSchema.index({ ownerId: 1, inverterId: 1 });

export const Inverter: Model<IInverter> =
  mongoose.models.Inverter || mongoose.model<IInverter>("Inverter", InverterSchema);
