/**
 * Solar Intel — Realistic Seed Script
 * ────────────────────────────────────
 * Inserts 3 plants × 10 inverters each (30 total) with realistic
 * telemetry data covering LOW, MEDIUM, HIGH, and CRITICAL risk profiles.
 * Also inserts 24h of telemetry records (every 15 min = 96 per inverter).
 *
 * Usage: 
 *   export MONGODB_URI="your_mongodb_connection_string"
 *   node scripts/seed-realistic.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  console.error("   Set it in .env.local or export it before running this script");
  process.exit(1);
}

// ─────────────────────────────────────────────
// 3 Plants
// ─────────────────────────────────────────────
const PLANTS = [
  {
    plantId: "Plant 1",
    name: "Rajasthan Solar Park",
    location: "Rajasthan, India",
    latitude: 26.9124,
    longitude: 70.9001,
    capacity: 2.5,
    area: 12,
    status: "active",
    inverterCount: 10,
    description: "Large-scale solar park in the Thar Desert region with high irradiance.",
  },
  {
    plantId: "Plant 2",
    name: "Gujarat Solar Farm",
    location: "Gujarat, India",
    latitude: 23.0225,
    longitude: 72.5714,
    capacity: 1.8,
    area: 8,
    status: "active",
    inverterCount: 10,
    description: "Coastal solar installation near the Gulf of Khambhat.",
  },
  {
    plantId: "Plant 3",
    name: "Karnataka PV Station",
    location: "Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    capacity: 2.0,
    area: 10,
    status: "active",
    inverterCount: 10,
    description: "High-altitude solar station with consistent cloud-free days.",
  },
];

// ─────────────────────────────────────────────
// Inverter profiles — risk distribution per plant:
//   3 Healthy (low risk)
//   3 Medium risk
//   2 High risk
//   2 Critical risk
// ─────────────────────────────────────────────
const INVERTER_MODELS = [
  "SolarEdge SE250K",
  "Huawei SUN2000-215KTL",
  "SMA Sunny Tripower 250",
  "ABB PVS-175-TL",
  "Fronius Symo 250",
];

const FIRMWARE_VERSIONS = ["v4.2.1", "v4.1.3", "v3.9.8", "v4.0.5", "v3.8.2"];

// Risk profile templates — realistic telemetry ranges
const RISK_PROFILES = {
  healthy: {
    // Normal operating inverter
    inverterPower: () => 180000 + Math.random() * 60000,        // 180-240 kW → good output
    inverterPv1Power: () => 95000 + Math.random() * 25000,       // 95-120 kW
    inverterPv1Voltage: () => 580 + Math.random() * 40,          // 580-620 V (optimal MPP)
    inverterPv1Current: () => 160 + Math.random() * 30,          // 160-190 A
    inverterPv2Power: () => 90000 + Math.random() * 25000,       // 90-115 kW
    inverterPv2Voltage: () => 570 + Math.random() * 40,          // 570-610 V
    inverterPv2Current: () => 155 + Math.random() * 30,          // 155-185 A
    inverterKwhToday: () => 800 + Math.random() * 400,           // 800-1200 kWh/day
    inverterKwhTotal: () => 450000 + Math.random() * 200000,     // 450-650 MWh lifetime
    inverterTemp: () => 38 + Math.random() * 12,                 // 38-50°C (normal)
    inverterOpState: () => 1,                                     // Normal operation
    inverterAlarmCode: () => 0,                                   // No alarms
    inverterLimitPercent: () => 100,                              // No curtailment
    ambientTemp: () => 28 + Math.random() * 8,                   // 28-36°C
    meterActivePower: () => 170 + Math.random() * 50,            // 170-220 kW export
    performanceRatio: () => 88 + Math.random() * 8,              // 88-96%
    efficiency: () => 95 + Math.random() * 4,                    // 95-99%
    uptime: () => 98 + Math.random() * 2,                        // 98-100%
    riskScore: () => Math.floor(5 + Math.random() * 20),         // 5-25
    status: "healthy",
  },
  medium: {
    // Slight degradation, elevated temperature, minor issues
    inverterPower: () => 120000 + Math.random() * 50000,         // 120-170 kW (below rated)
    inverterPv1Power: () => 65000 + Math.random() * 25000,       // 65-90 kW (reduced)
    inverterPv1Voltage: () => 500 + Math.random() * 60,          // 500-560 V (slightly low)
    inverterPv1Current: () => 120 + Math.random() * 30,          // 120-150 A
    inverterPv2Power: () => 55000 + Math.random() * 25000,       // 55-80 kW
    inverterPv2Voltage: () => 490 + Math.random() * 50,          // 490-540 V
    inverterPv2Current: () => 110 + Math.random() * 30,          // 110-140 A
    inverterKwhToday: () => 500 + Math.random() * 300,           // 500-800 kWh/day
    inverterKwhTotal: () => 350000 + Math.random() * 150000,     // 350-500 MWh
    inverterTemp: () => 52 + Math.random() * 8,                  // 52-60°C (elevated)
    inverterOpState: () => 1,
    inverterAlarmCode: () => Math.random() > 0.5 ? 1 : 0,       // Occasional minor alarm
    inverterLimitPercent: () => 90 + Math.random() * 10,         // 90-100%
    ambientTemp: () => 32 + Math.random() * 8,                   // 32-40°C
    meterActivePower: () => 110 + Math.random() * 50,            // 110-160 kW
    performanceRatio: () => 75 + Math.random() * 10,             // 75-85%
    efficiency: () => 85 + Math.random() * 8,                    // 85-93%
    uptime: () => 92 + Math.random() * 5,                        // 92-97%
    riskScore: () => Math.floor(30 + Math.random() * 20),        // 30-50
    status: "warning",
  },
  high: {
    // Significant issues — overheating, string failures, high alarm count
    inverterPower: () => 60000 + Math.random() * 50000,          // 60-110 kW (heavily degraded)
    inverterPv1Power: () => 35000 + Math.random() * 25000,       // 35-60 kW (string failing)
    inverterPv1Voltage: () => 380 + Math.random() * 80,          // 380-460 V (voltage drop)
    inverterPv1Current: () => 80 + Math.random() * 30,           // 80-110 A (current drop)
    inverterPv2Power: () => 25000 + Math.random() * 25000,       // 25-50 kW
    inverterPv2Voltage: () => 350 + Math.random() * 80,          // 350-430 V
    inverterPv2Current: () => 65 + Math.random() * 30,           // 65-95 A
    inverterKwhToday: () => 200 + Math.random() * 250,           // 200-450 kWh/day
    inverterKwhTotal: () => 280000 + Math.random() * 100000,     // 280-380 MWh
    inverterTemp: () => 62 + Math.random() * 8,                  // 62-70°C (high)
    inverterOpState: () => Math.random() > 0.5 ? 2 : 1,         // Degraded operation
    inverterAlarmCode: () => Math.floor(2 + Math.random() * 3),  // 2-4 active alarms
    inverterLimitPercent: () => 70 + Math.random() * 15,         // 70-85% (curtailed)
    ambientTemp: () => 36 + Math.random() * 8,                   // 36-44°C
    meterActivePower: () => 55 + Math.random() * 40,             // 55-95 kW
    performanceRatio: () => 55 + Math.random() * 15,             // 55-70%
    efficiency: () => 70 + Math.random() * 12,                   // 70-82%
    uptime: () => 80 + Math.random() * 10,                       // 80-90%
    riskScore: () => Math.floor(60 + Math.random() * 15),        // 60-75
    status: "critical",
  },
  critical: {
    // Severe — near-failure, IGBT overheating, multiple alarms, very low output
    inverterPower: () => 5000 + Math.random() * 40000,           // 5-45 kW (almost no output)
    inverterPv1Power: () => 3000 + Math.random() * 20000,        // 3-23 kW
    inverterPv1Voltage: () => 200 + Math.random() * 150,         // 200-350 V (severe drop)
    inverterPv1Current: () => 15 + Math.random() * 50,           // 15-65 A
    inverterPv2Power: () => 2000 + Math.random() * 18000,        // 2-20 kW
    inverterPv2Voltage: () => 180 + Math.random() * 130,         // 180-310 V
    inverterPv2Current: () => 10 + Math.random() * 45,           // 10-55 A
    inverterKwhToday: () => 20 + Math.random() * 150,            // 20-170 kWh/day
    inverterKwhTotal: () => 200000 + Math.random() * 80000,      // 200-280 MWh
    inverterTemp: () => 72 + Math.random() * 12,                 // 72-84°C (DANGER)
    inverterOpState: () => Math.floor(3 + Math.random() * 2),    // Fault/shutdown state
    inverterAlarmCode: () => Math.floor(5 + Math.random() * 5),  // 5-9 active alarms
    inverterLimitPercent: () => 30 + Math.random() * 30,         // 30-60% (heavy curtailment)
    ambientTemp: () => 38 + Math.random() * 10,                  // 38-48°C
    meterActivePower: () => 5 + Math.random() * 30,              // 5-35 kW
    performanceRatio: () => 20 + Math.random() * 30,             // 20-50%
    efficiency: () => 40 + Math.random() * 25,                   // 40-65%
    uptime: () => 50 + Math.random() * 25,                       // 50-75%
    riskScore: () => Math.floor(80 + Math.random() * 20),        // 80-100
    status: "critical",
  },
};

// Risk distribution per plant: 3 healthy, 3 medium, 2 high, 2 critical
const RISK_DISTRIBUTION = [
  "healthy", "healthy", "healthy",
  "medium", "medium", "medium",
  "high", "high",
  "critical", "critical",
];

function buildInverter(plantId, plantLocation, invNum, riskKey) {
  const profile = RISK_PROFILES[riskKey];
  const inverterId = `INV-${plantId.replace(/\s+/g, "")}-${invNum}`;

  return {
    inverterId,
    plantId,
    name: `Inverter ${invNum}`,
    location: plantLocation,
    status: profile.status,
    inverterPower: round(profile.inverterPower()),
    inverterPv1Power: round(profile.inverterPv1Power()),
    inverterPv1Voltage: round(profile.inverterPv1Voltage()),
    inverterPv1Current: round(profile.inverterPv1Current()),
    inverterPv2Power: round(profile.inverterPv2Power()),
    inverterPv2Voltage: round(profile.inverterPv2Voltage()),
    inverterPv2Current: round(profile.inverterPv2Current()),
    inverterKwhToday: round(profile.inverterKwhToday()),
    inverterKwhTotal: round(profile.inverterKwhTotal()),
    inverterTemp: round(profile.inverterTemp(), 1),
    inverterOpState: profile.inverterOpState(),
    inverterAlarmCode: profile.inverterAlarmCode(),
    inverterLimitPercent: round(profile.inverterLimitPercent()),
    ambientTemp: round(profile.ambientTemp(), 1),
    meterActivePower: round(profile.meterActivePower()),
    riskScore: profile.riskScore(),
    performanceRatio: round(profile.performanceRatio(), 1),
    efficiency: round(profile.efficiency(), 1),
    uptime: round(profile.uptime(), 1),
    inverterModel: INVERTER_MODELS[invNum % INVERTER_MODELS.length],
    capacity: 250,
    installDate: new Date(`202${1 + (invNum % 4)}-0${1 + (invNum % 9)}-15`),
    firmware: FIRMWARE_VERSIONS[invNum % FIRMWARE_VERSIONS.length],
    lastUpdated: new Date(),
    strings: [],
  };
}

/**
 * Build 24h of telemetry for an inverter (every 15 min = 96 records).
 * Values fluctuate around the inverter's baseline with solar curve simulation.
 */
function buildTelemetry(inverter) {
  const records = [];
  const now = new Date();

  for (let i = 95; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hour = ts.getHours();

    // Solar curve factor: 0 at night, peaks at noon
    let solarFactor;
    if (hour < 6 || hour > 19) solarFactor = 0;
    else if (hour < 10) solarFactor = (hour - 6) / 4;         // ramp up
    else if (hour <= 14) solarFactor = 0.85 + Math.random() * 0.15; // peak
    else solarFactor = (19 - hour) / 5;                        // ramp down

    // Add noise
    const noise = 0.9 + Math.random() * 0.2; // ±10%

    records.push({
      inverterId: inverter.inverterId,
      plantId: inverter.plantId,
      timestamp: ts,
      inverterPower: round(inverter.inverterPower * solarFactor * noise),
      inverterPv1Power: round(inverter.inverterPv1Power * solarFactor * noise),
      inverterPv1Voltage: round(inverter.inverterPv1Voltage * (solarFactor > 0 ? (0.85 + solarFactor * 0.15) : 0.1) * noise),
      inverterPv1Current: round(inverter.inverterPv1Current * solarFactor * noise),
      inverterPv2Power: round(inverter.inverterPv2Power * solarFactor * noise),
      inverterPv2Voltage: round(inverter.inverterPv2Voltage * (solarFactor > 0 ? (0.85 + solarFactor * 0.15) : 0.1) * noise),
      inverterPv2Current: round(inverter.inverterPv2Current * solarFactor * noise),
      inverterKwhToday: round(inverter.inverterKwhToday * (1 - i / 96)),  // accumulates through day
      inverterKwhTotal: round(inverter.inverterKwhTotal + inverter.inverterKwhToday * (1 - i / 96)),
      inverterTemp: round(inverter.inverterTemp + (solarFactor * 8 - 4) + (Math.random() * 4 - 2), 1),
      inverterOpState: inverter.inverterOpState,
      inverterAlarmCode: inverter.inverterAlarmCode,
      inverterLimitPercent: inverter.inverterLimitPercent,
      ambientTemp: round(inverter.ambientTemp + (solarFactor * 6 - 3) + (Math.random() * 3 - 1.5), 1),
      meterActivePower: round(inverter.meterActivePower * solarFactor * noise),
    });
  }
  return records;
}

function round(n, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to:", MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@"));

  const db = mongoose.connection.db;

  // 1) Drop old data
  console.log("\n🗑️  Clearing old data...");
  const colls = ["plants", "inverters", "telemetryrecords"];
  for (const c of colls) {
    try {
      await db.collection(c).deleteMany({});
      console.log(`   ✓ Cleared ${c}`);
    } catch {
      console.log(`   ✓ ${c} (already empty)`);
    }
  }

  // 2) Insert Plants
  console.log("\n🌱 Inserting 3 plants...");
  await db.collection("plants").insertMany(
    PLANTS.map((p) => ({
      ...p,
      commissionDate: new Date("2022-03-15"),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );
  console.log("   ✓ 3 plants created");

  // 3) Build inverters — 10 per plant with risk distribution
  console.log("\n⚡ Inserting 30 inverters (10 per plant)...");
  const allInverters = [];

  for (const plant of PLANTS) {
    // Shuffle risk distribution for each plant so it's not identical order
    const shuffled = [...RISK_DISTRIBUTION].sort(() => Math.random() - 0.5);

    for (let i = 1; i <= 10; i++) {
      const riskKey = shuffled[i - 1];
      const inv = buildInverter(plant.plantId, plant.location, i, riskKey);
      allInverters.push(inv);
    }
  }

  await db.collection("inverters").insertMany(
    allInverters.map((inv) => ({
      ...inv,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  // Print risk breakdown
  const breakdown = { healthy: 0, warning: 0, critical: 0 };
  for (const inv of allInverters) breakdown[inv.status]++;
  console.log(`   ✓ 30 inverters created`);
  console.log(`     Healthy: ${breakdown.healthy} | Warning: ${breakdown.warning} | Critical: ${breakdown.critical}`);
  console.log(`     Risk distribution per plant: 3 low, 3 medium, 2 high, 2 critical`);

  // 4) Build telemetry — 96 records per inverter (24h × 15min intervals)
  console.log("\n📊 Inserting telemetry (96 records × 30 inverters = 2,880 records)...");
  const allTelemetry = [];
  for (const inv of allInverters) {
    allTelemetry.push(...buildTelemetry(inv));
  }

  // Insert in batches of 500
  for (let i = 0; i < allTelemetry.length; i += 500) {
    await db.collection("telemetryrecords").insertMany(allTelemetry.slice(i, i + 500));
  }
  console.log(`   ✓ ${allTelemetry.length} telemetry records created`);

  // 5) Summary
  console.log("\n" + "═".repeat(50));
  console.log("✅ SEED COMPLETE");
  console.log("═".repeat(50));
  console.log(`   Plants:     3`);
  console.log(`   Inverters:  30 (10 per plant)`);
  console.log(`   Telemetry:  ${allTelemetry.length} records (24h history)`);
  console.log(`   Risk Mix:   9 healthy, 9 warning, 6 high, 6 critical`);
  console.log("═".repeat(50));

  // Print per-plant detail
  for (const plant of PLANTS) {
    const plantInvs = allInverters.filter((i) => i.plantId === plant.plantId);
    console.log(`\n   ${plant.name} (${plant.plantId}):`);
    for (const inv of plantInvs) {
      const risk = inv.riskScore;
      const riskLabel = risk >= 80 ? "CRITICAL" : risk >= 60 ? "HIGH" : risk >= 30 ? "MEDIUM" : "LOW";
      const power = (inv.inverterPower / 1000).toFixed(1);
      const temp = inv.inverterTemp.toFixed(1);
      console.log(`     ${inv.inverterId.padEnd(18)} ${inv.status.padEnd(9)} Risk: ${String(risk).padStart(3)}  (${riskLabel.padEnd(8)})  Power: ${power.padStart(6)} kW  Temp: ${temp.padStart(5)}°C`);
    }
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected. Done!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
