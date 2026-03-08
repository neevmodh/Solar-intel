#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Standalone DB Seed Script
 * ─────────────────────────────────────────────────────────
 * Run directly via:  npx tsx scripts/seed-db.ts
 *
 * Creates the database + all 3 collections on Atlas and
 * populates them with 8 demo inverters + ~3120 telemetry
 * records (30 days × 13 h/day × 8 inverters).
 * ─────────────────────────────────────────────────────────
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

// ── Load .env.local ──────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not set in .env.local");
  process.exit(1);
}

// ═══════════════════════════════════════════════════════
// INLINE SCHEMAS (no path aliases needed)
// ═══════════════════════════════════════════════════════

// ── User ────────────────────────────────────────────────
interface IUser extends Document {
  googleId: string; name: string; email: string; image: string;
  role: "admin" | "operator" | "viewer";
  accountId: string; plan: string; planCost: number; nextRenewal: string;
  notifications: Record<string, boolean>;
}
const UserSchema = new Schema<IUser>(
  {
    googleId:   { type: String, required: true, unique: true },
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true },
    image:      { type: String, default: "" },
    role:       { type: String, enum: ["admin", "operator", "viewer"], default: "operator" },
    accountId:  { type: String, default: "" },
    plan:       { type: String, enum: ["basic", "premium", "pro"], default: "premium" },
    planCost:   { type: Number, default: 2999 },
    nextRenewal:{ type: String, default: "" },
    notifications: {
      email:                { type: Boolean, default: true },
      sms:                  { type: Boolean, default: true },
      push:                 { type: Boolean, default: true },
      criticalAlerts:       { type: Boolean, default: true },
      weeklyReport:         { type: Boolean, default: true },
      maintenanceReminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// ── Inverter ─────────────────────────────────────────────
interface IInverterString { stringId: string; voltage: number; current: number; power: number; status: string; }
interface IInverter extends Document {
  inverterId: string; plantId: string; name: string; location: string; status: string;
  performanceRatio: number; temperature: number; powerOutput: number;
  riskScore: number; lastUpdated: Date; uptime: number; inverterModel: string;
  capacity: number; installDate: Date; firmware: string;
  dcVoltage: number; acVoltage: number; frequency: number;
  currentOutput: number; dailyYield: number; lifetimeYield: number;
  efficiency: number; strings: IInverterString[];
}
const InverterStringSchema = new Schema<IInverterString>(
  { stringId: String, voltage: Number, current: Number, power: Number, status: String },
  { _id: false }
);
const InverterSchema = new Schema<IInverter>(
  {
    inverterId:       { type: String, required: true, unique: true },
    plantId:          { type: String, required: true, index: true },
    name:             { type: String, required: true },
    location:         { type: String, required: true },
    status:           { type: String, enum: ["healthy", "warning", "critical"], default: "healthy" },
    performanceRatio: { type: Number, default: 0 },
    temperature:      { type: Number, default: 0 },
    powerOutput:      { type: Number, default: 0 },
    riskScore:        { type: Number, default: 0 },
    lastUpdated:      { type: Date,   default: Date.now },
    uptime:           { type: Number, default: 100 },
    inverterModel:    { type: String, required: true },
    capacity:         { type: Number, required: true },
    installDate:      { type: Date,   required: true },
    firmware:         { type: String, default: "" },
    dcVoltage:        { type: Number, default: 0 },
    acVoltage:        { type: Number, default: 0 },
    frequency:        { type: Number, default: 50 },
    currentOutput:    { type: Number, default: 0 },
    dailyYield:       { type: Number, default: 0 },
    lifetimeYield:    { type: Number, default: 0 },
    efficiency:       { type: Number, default: 0 },
    strings:          [InverterStringSchema],
  },
  { timestamps: true }
);
const Inverter: Model<IInverter> = mongoose.models.Inverter || mongoose.model<IInverter>("Inverter", InverterSchema);

// ── Telemetry ─────────────────────────────────────────────
interface ITelemetry extends Document {
  inverterId: string; timestamp: Date;
  dcVoltage: number; acVoltage: number; current: number;
  temperature: number; frequency: number; powerOutput: number;
  efficiency: number; performanceRatio: number;
  irradiance: number; ambientTemp: number; dailyYield: number;
  stringVoltages: number[]; stringCurrents: number[];
}
const TelemetrySchema = new Schema<ITelemetry>(
  {
    inverterId:       { type: String, required: true, index: true },
    timestamp:        { type: Date,   required: true },
    dcVoltage:        { type: Number, required: true },
    acVoltage:        { type: Number, required: true },
    current:          { type: Number, required: true },
    temperature:      { type: Number, required: true },
    frequency:        { type: Number, default: 50 },
    powerOutput:      { type: Number, required: true },
    efficiency:       { type: Number, default: 0 },
    performanceRatio: { type: Number, default: 0 },
    irradiance:       { type: Number, default: 0 },
    ambientTemp:      { type: Number, default: 0 },
    dailyYield:       { type: Number, default: 0 },
    stringVoltages:   [{ type: Number }],
    stringCurrents:   [{ type: Number }],
  },
  { timestamps: true }
);
TelemetrySchema.index({ inverterId: 1, timestamp: -1 });
TelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
const TelemetryRecord: Model<ITelemetry> =
  mongoose.models.TelemetryRecord || mongoose.model<ITelemetry>("TelemetryRecord", TelemetrySchema);

// ── Plant ────────────────────────────────────────────────
interface IPlant extends Document {
  plantId: string; name: string; location: string;
  latitude: number; longitude: number; capacity: number;
  area: number; commissionDate: Date; status: string;
  inverterCount: number; description: string; ownerId: string;
}
const PlantSchema = new Schema<IPlant>(
  {
    plantId:        { type: String, required: true, unique: true, index: true },
    name:           { type: String, required: true },
    location:       { type: String, required: true },
    latitude:       { type: Number, default: 0 },
    longitude:      { type: Number, default: 0 },
    capacity:       { type: Number, required: true },
    area:           { type: Number, default: 0 },
    commissionDate: { type: Date, default: Date.now },
    status:         { type: String, enum: ["active", "maintenance", "offline"], default: "active" },
    inverterCount:  { type: Number, default: 0 },
    description:    { type: String, default: "" },
    ownerId:        { type: String, default: "" },
  },
  { timestamps: true }
);
const Plant: Model<IPlant> = mongoose.models.Plant || mongoose.model<IPlant>("Plant", PlantSchema);

// ═══════════════════════════════════════════════════════
// SEED DATA — 3 Plants
// ═══════════════════════════════════════════════════════
const PLANTS = [
  {
    plantId: "PLANT-001", name: "Rajasthan Solar Park", location: "Rajasthan, Sector 12",
    latitude: 26.9124, longitude: 70.9001, capacity: 0.5, area: 2.5,
    commissionDate: "2024-06-01", status: "active",
    description: "Main utility-scale solar park in Rajasthan with SolarEdge inverters.",
  },
  {
    plantId: "PLANT-002", name: "Gujarat Green Energy Hub", location: "Gujarat, Zone 4",
    latitude: 23.0225, longitude: 72.5714, capacity: 0.39, area: 1.8,
    commissionDate: "2024-03-15", status: "active",
    description: "Mixed fleet installation with Huawei and ABB inverters.",
  },
  {
    plantId: "PLANT-003", name: "Southern Grid Complex", location: "Karnataka, Area 3",
    latitude: 12.9716, longitude: 77.5946, capacity: 0.625, area: 3.2,
    commissionDate: "2024-08-01", status: "active",
    description: "Modern installation with SMA and Growatt inverters plus rooftop arrays.",
  },
];

// ═══════════════════════════════════════════════════════
// SEED DATA — 8 Inverters
// ═══════════════════════════════════════════════════════
const INVERTERS = [
  {
    inverterId: "INV-001", plantId: "PLANT-001", name: "Aurora-7 Block A", location: "Rajasthan, Sector 12",
    status: "healthy", performanceRatio: 94.2, temperature: 42, powerOutput: 248.5,
    riskScore: 8, uptime: 99.7, inverterModel: "SolarEdge SE250K", capacity: 250,
    installDate: "2024-06-15", firmware: "v4.12.3", dcVoltage: 620, acVoltage: 233.8,
    frequency: 49.98, currentOutput: 362, dailyYield: 1842, lifetimeYield: 1245.6, efficiency: 98.1,
    strings: [
      { stringId: "S1", voltage: 620, current: 9.2, power: 5704, status: "healthy" },
      { stringId: "S2", voltage: 618, current: 9.1, power: 5624, status: "healthy" },
      { stringId: "S3", voltage: 622, current: 9.3, power: 5785, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-002", plantId: "PLANT-001", name: "Aurora-7 Block B", location: "Rajasthan, Sector 12",
    status: "healthy", performanceRatio: 91.8, temperature: 44, powerOutput: 235.1,
    riskScore: 12, uptime: 99.2, inverterModel: "SolarEdge SE250K", capacity: 250,
    installDate: "2024-06-15", firmware: "v4.12.3", dcVoltage: 615, acVoltage: 233.5,
    frequency: 49.96, currentOutput: 345, dailyYield: 1756, lifetimeYield: 1198.3, efficiency: 97.6,
    strings: [
      { stringId: "S1", voltage: 616, current: 9.0, power: 5544, status: "healthy" },
      { stringId: "S2", voltage: 614, current: 8.9, power: 5465, status: "healthy" },
      { stringId: "S3", voltage: 615, current: 8.8, power: 5412, status: "warning" },
    ],
  },
  {
    inverterId: "INV-003", plantId: "PLANT-002", name: "Solaris-9 East Wing", location: "Gujarat, Zone 4",
    status: "warning", performanceRatio: 78.4, temperature: 58, powerOutput: 187.3,
    riskScore: 45, uptime: 96.1, inverterModel: "Huawei SUN2000-215", capacity: 215,
    installDate: "2024-03-22", firmware: "v3.8.1", dcVoltage: 580, acVoltage: 231.2,
    frequency: 49.92, currentOutput: 278, dailyYield: 1320, lifetimeYield: 945.7, efficiency: 91.4,
    strings: [
      { stringId: "S1", voltage: 582, current: 8.4, power: 4889, status: "healthy" },
      { stringId: "S2", voltage: 560, current: 7.2, power: 4032, status: "warning" },
      { stringId: "S3", voltage: 578, current: 8.1, power: 4682, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-004", plantId: "PLANT-002", name: "Helios-3 Central", location: "Tamil Nadu, Grid 7",
    status: "critical", performanceRatio: 52.1, temperature: 72, powerOutput: 98.6,
    riskScore: 87, uptime: 88.4, inverterModel: "ABB PVS-175", capacity: 175,
    installDate: "2023-11-08", firmware: "v2.9.7", dcVoltage: 480, acVoltage: 228.1,
    frequency: 49.85, currentOutput: 148, dailyYield: 624, lifetimeYield: 712.3, efficiency: 78.2,
    strings: [
      { stringId: "S1", voltage: 485, current: 6.2, power: 3007, status: "warning" },
      { stringId: "S2", voltage: 440, current: 4.1, power: 1804, status: "critical" },
      { stringId: "S3", voltage: 478, current: 5.8, power: 2772, status: "warning" },
    ],
  },
  {
    inverterId: "INV-005", plantId: "PLANT-003", name: "Zenith-12 North", location: "Karnataka, Area 3",
    status: "healthy", performanceRatio: 96.7, temperature: 38, powerOutput: 262.4,
    riskScore: 5, uptime: 99.9, inverterModel: "SMA Sunny Tripower 250", capacity: 250,
    installDate: "2025-01-10", firmware: "v5.1.0", dcVoltage: 640, acVoltage: 234.2,
    frequency: 50.01, currentOutput: 380, dailyYield: 1920, lifetimeYield: 680.4, efficiency: 98.8,
    strings: [
      { stringId: "S1", voltage: 642, current: 9.5, power: 6099, status: "healthy" },
      { stringId: "S2", voltage: 638, current: 9.4, power: 5997, status: "healthy" },
      { stringId: "S3", voltage: 641, current: 9.5, power: 6090, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-006", plantId: "PLANT-002", name: "Prism-4 Module C", location: "Maharashtra, Sector 8",
    status: "warning", performanceRatio: 74.2, temperature: 55, powerOutput: 172.8,
    riskScore: 52, uptime: 94.8, inverterModel: "Growatt MAX 200KTL3", capacity: 200,
    installDate: "2024-08-30", firmware: "v3.2.4", dcVoltage: 565, acVoltage: 230.8,
    frequency: 49.90, currentOutput: 252, dailyYield: 1180, lifetimeYield: 560.2, efficiency: 89.7,
    strings: [
      { stringId: "S1", voltage: 568, current: 7.8, power: 4430, status: "healthy" },
      { stringId: "S2", voltage: 545, current: 6.5, power: 3543, status: "warning" },
      { stringId: "S3", voltage: 562, current: 7.5, power: 4215, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-007", plantId: "PLANT-003", name: "Nova-6 South Array", location: "Andhra Pradesh, Zone 2",
    status: "healthy", performanceRatio: 92.5, temperature: 41, powerOutput: 241.9,
    riskScore: 10, uptime: 99.5, inverterModel: "SolarEdge SE250K", capacity: 250,
    installDate: "2024-09-12", firmware: "v4.12.3", dcVoltage: 625, acVoltage: 234.0,
    frequency: 49.99, currentOutput: 352, dailyYield: 1798, lifetimeYield: 432.1, efficiency: 97.8,
    strings: [
      { stringId: "S1", voltage: 626, current: 9.1, power: 5697, status: "healthy" },
      { stringId: "S2", voltage: 624, current: 9.0, power: 5616, status: "healthy" },
      { stringId: "S3", voltage: 625, current: 9.1, power: 5688, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-008", plantId: "PLANT-003", name: "Eclipse-2 West", location: "Madhya Pradesh, Grid 5",
    status: "critical", performanceRatio: 38.9, temperature: 78, powerOutput: 67.2,
    riskScore: 93, uptime: 82.1, inverterModel: "ABB PVS-175", capacity: 175,
    installDate: "2023-09-20", firmware: "v2.9.5", dcVoltage: 420, acVoltage: 226.4,
    frequency: 49.78, currentOutput: 102, dailyYield: 398, lifetimeYield: 834.6, efficiency: 68.5,
    strings: [
      { stringId: "S1", voltage: 425, current: 4.8, power: 2040, status: "critical" },
      { stringId: "S2", voltage: 410, current: 3.2, power: 1312, status: "critical" },
      { stringId: "S3", voltage: 418, current: 4.1, power: 1714, status: "critical" },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// TELEMETRY GENERATOR
// ═══════════════════════════════════════════════════════
function makeTelemetry(
  inverterId: string, baseTemp: number, baseEff: number, basePR: number, basePower: number
) {
  const records = [];
  const now = new Date();
  for (let day = 29; day >= 0; day--) {
    for (let hour = 6; hour <= 18; hour++) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - day);
      ts.setHours(hour, 0, 0, 0);
      const sf = Math.sin(((hour - 6) / 12) * Math.PI);
      records.push({
        inverterId, timestamp: ts,
        dcVoltage:        580 + Math.random() * 60,
        acVoltage:        228 + Math.random() * 8,
        current:          basePower * sf * 0.4 + (Math.random() - 0.5) * 20,
        temperature:      baseTemp + (Math.random() - 0.5) * 6 + sf * 5,
        frequency:        49.9 + Math.random() * 0.2,
        powerOutput:      basePower * sf + (Math.random() - 0.5) * 20,
        efficiency:       baseEff + (Math.random() - 0.5) * 3,
        performanceRatio: basePR  + (Math.random() - 0.5) * 4,
        irradiance:       Math.round(sf * 950 + (Math.random() - 0.5) * 50),
        ambientTemp:      28 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 8,
        dailyYield:       basePower * sf * 0.8,
        stringVoltages:   [580 + Math.random() * 60, 578 + Math.random() * 60, 582 + Math.random() * 60],
        stringCurrents:   [8 + Math.random() * 2, 7.5 + Math.random() * 2, 8.2 + Math.random() * 2],
      });
    }
  }
  return records;
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  console.log("\n🌱  Solar Intel — Database Seed");
  console.log("──────────────────────────────────────");

  // Connect
  console.log("⏳  Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI!, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });
  console.log("✅  Connected:", MONGODB_URI!.replace(/\/\/.*@/, "//<credentials>@"));

  // ── Collections are created automatically on first insert ──

  // Ensure indexes exist on all collections
  console.log("\n📐  Syncing indexes...");
  await User.createIndexes();
  await Plant.createIndexes();
  await Inverter.createIndexes();
  await TelemetryRecord.createIndexes();
  console.log("✅  Indexes ready");

  // Check existing data
  const existingPlants = await Plant.countDocuments();
  const existingInverters = await Inverter.countDocuments();
  if (existingPlants > 0 && existingInverters > 0) {
    console.log(`\n⚠️   Already seeded (${existingPlants} plants, ${existingInverters} inverters found). Nothing to do.`);
    console.log("    To reseed: delete the 'plants', 'inverters' and 'telemetryrecords' collections first.\n");
    await mongoose.disconnect();
    return;
  }

  // ── Clean slate ────────────────────────────────────
  await Plant.deleteMany({});
  await Inverter.deleteMany({});
  await TelemetryRecord.deleteMany({});

  // ── Seed Plants ────────────────────────────────────
  console.log("\n🏭  Seeding 3 plants...");
  const plantDocs = PLANTS.map((p) => ({
    ...p,
    commissionDate: new Date(p.commissionDate),
    inverterCount: INVERTERS.filter((inv) => inv.plantId === p.plantId).length,
  }));
  await Plant.insertMany(plantDocs);
  console.log(`✅  ${plantDocs.length} plants inserted`);

  // ── Seed Inverters ─────────────────────────────────
  console.log("\n🔌  Seeding 8 inverters...");
  const inverterDocs = INVERTERS.map((inv) => ({
    ...inv,
    installDate: new Date(inv.installDate),
    lastUpdated: new Date(),
  }));
  await Inverter.insertMany(inverterDocs);
  console.log(`✅  ${inverterDocs.length} inverters inserted`);

  // ── Seed Telemetry ─────────────────────────────────
  console.log("\n📊  Generating 30-day telemetry (~3120 records)...");
  const baseParams: [string, number, number, number, number][] = [
    ["INV-001", 42, 98.1, 94.2, 248.5],
    ["INV-002", 44, 97.6, 91.8, 235.1],
    ["INV-003", 58, 91.4, 78.4, 187.3],
    ["INV-004", 72, 78.2, 52.1, 98.6],
    ["INV-005", 38, 98.8, 96.7, 262.4],
    ["INV-006", 55, 89.7, 74.2, 172.8],
    ["INV-007", 41, 97.8, 92.5, 241.9],
    ["INV-008", 78, 68.5, 38.9, 67.2],
  ];

  const allTelemetry = baseParams.flatMap(([id, t, e, p, pw]) => makeTelemetry(id, t, e, p, pw));

  let inserted = 0;
  for (let i = 0; i < allTelemetry.length; i += 500) {
    const batch = allTelemetry.slice(i, i + 500);
    await TelemetryRecord.insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write(`\r    ${inserted}/${allTelemetry.length} records...`);
  }
  console.log(`\n✅  ${inserted} telemetry records inserted`);

  // ── Summary ────────────────────────────────────────
  console.log("\n──────────────────────────────────────");
  console.log("🎉  Seed complete! Collections created:");
  console.log(`    📁 users           — 0 docs (populated on first sign-in)`);
  console.log(`    📁 plants          — ${plantDocs.length} docs`);
  console.log(`    📁 inverters       — ${inverterDocs.length} docs`);
  console.log(`    📁 telemetryrecords — ${inserted} docs`);
  console.log("\n    View your data at: https://cloud.mongodb.com\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
