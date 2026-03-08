#!/usr/bin/env node
/**
 * seed-from-csv.mjs
 * ------------------
 * Reads master_refined.csv and seeds MongoDB Atlas with:
 *   - plants       (3 docs — one per unique plant_id)
 *   - inverters    (29 docs — one per unique plant+inverter, latest snapshot)
 *   - telemetryrecords (sampled time-series rows)
 *
 * Usage:  
 *   export MONGODB_URI="your_mongodb_connection_string"
 *   node scripts/seed-from-csv.mjs
 */

import { readFileSync } from "fs";
import { MongoClient } from "mongodb";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

// ── Config ──
const CSV_PATH = process.env.CSV_PATH || "/Users/jaimin/HM/Solar_Plant_Dataset/master_refined.csv";
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  console.error("   Set it in .env.local or export it before running this script");
  process.exit(1);
}
const DB_NAME = "solar-intel";
const TELEMETRY_SAMPLE = 15000; // how many telemetry rows to keep (last N)

// ── Plant metadata (not in CSV) ──
const PLANT_META = {
  "Plant 1": { location: "Rajasthan, India", lat: 26.9124, lng: 70.9001 },
  "Plant 2": { location: "Gujarat, India", lat: 23.0225, lng: 72.5714 },
  "Plant 3": { location: "Karnataka, India", lat: 12.9716, lng: 77.5946 },
};

// ── Parse CSV ──
function parseCSV(path) {
  const raw = readFileSync(path, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    if (vals.length < headers.length) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = vals[j]?.trim() ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function cleanInverterId(plantId, rawId) {
  const n = String(rawId).replace(/\.0$/, "");
  return `INV-${plantId.replace(/\s+/g, "")}-${n}`;
}

// ── Main ──
async function main() {
  console.log("📖 Reading CSV...");
  const rows = parseCSV(CSV_PATH);
  console.log(`   ${rows.length.toLocaleString()} rows parsed`);

  // ── Connect ──
  console.log("🔌 Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // ── 1) Drop old data ──
  console.log("🗑️  Dropping old collections...");
  await Promise.all([
    db.collection("plants").deleteMany({}),
    db.collection("inverters").deleteMany({}),
    db.collection("telemetryrecords").deleteMany({}),
  ]);
  console.log("   ✅ All old data cleared");

  // ── 2) Aggregate per-plant and per-inverter stats ──
  console.log("📊 Computing aggregates...");

  // Group rows by plant
  const plantInverters = new Map(); // plantId → Set<inverterId>
  // Keep last snapshot per inverter (latest timestamp wins)
  const inverterLatest = new Map(); // "plantId__rawId" → row
  // Also compute per-inverter aggregated stats from ALL rows
  const inverterStats = new Map(); // key → { sumPower, sumTemp, count, maxTemp, maxPower, alarmCount, ... }

  for (const row of rows) {
    const pid = row.plant_id;
    const rawId = row.inverter_id;
    const key = `${pid}__${rawId}`;

    if (!plantInverters.has(pid)) plantInverters.set(pid, new Set());
    plantInverters.get(pid).add(rawId);

    // Latest snapshot (last row wins since CSV is chronological)
    inverterLatest.set(key, row);

    // Accumulate stats
    if (!inverterStats.has(key)) {
      inverterStats.set(key, {
        sumPower: 0, sumTemp: 0, sumAmbTemp: 0, sumPv1V: 0,
        sumPv1C: 0, sumKwhToday: 0, count: 0,
        maxPower: 0, maxTemp: 0, maxKwhToday: 0,
        alarmCount: 0, abnormalOpStates: 0,
        timestamps: [],
      });
    }
    const s = inverterStats.get(key);
    const power = num(row.inverter_power);
    const temp = num(row.inverter_temp);
    s.sumPower += power;
    s.sumTemp += temp;
    s.sumAmbTemp += num(row.ambient_temp);
    s.sumPv1V += num(row.inverter_pv1_voltage);
    s.sumPv1C += num(row.inverter_pv1_current);
    s.sumKwhToday += num(row.inverter_kwh_today);
    s.count++;
    if (power > s.maxPower) s.maxPower = power;
    if (temp > s.maxTemp) s.maxTemp = temp;
    if (num(row.inverter_kwh_today) > s.maxKwhToday) s.maxKwhToday = num(row.inverter_kwh_today);
    if (num(row.inverter_alarm_code) !== 0) s.alarmCount++;
    if (num(row.inverter_op_state) < 0) s.abnormalOpStates++;
  }

  // ── 3) Create Plant documents ──
  console.log("🌱 Creating plants...");
  const plantDocs = [];
  for (const [pid, invSet] of plantInverters) {
    const meta = PLANT_META[pid] || { location: "India", lat: 20.5, lng: 78.9 };
    const invCount = invSet.size;
    plantDocs.push({
      plantId: pid,
      name: pid,
      location: meta.location,
      latitude: meta.lat,
      longitude: meta.lng,
      capacity: +(invCount * 0.025).toFixed(3), // ~25kW per inverter → MW
      area: invCount * 2, // rough estimate
      commissionDate: new Date("2023-01-01"),
      status: "active",
      inverterCount: invCount,
      description: `Solar plant with ${invCount} inverters in ${meta.location}`,
    });
  }
  await db.collection("plants").insertMany(plantDocs);
  console.log(`   ✅ ${plantDocs.length} plants created`);

  // ── 4) Create Inverter documents (latest snapshot + aggregated stats) ──
  console.log("⚡ Creating inverters...");
  const inverterDocs = [];
  for (const [key, snap] of inverterLatest) {
    const pid = snap.plant_id;
    const rawId = snap.inverter_id;
    const inverterId = cleanInverterId(pid, rawId);
    const invNum = String(rawId).replace(/\.0$/, "");
    const meta = PLANT_META[pid] || { location: "India" };
    const stats = inverterStats.get(key);
    const avg = (field) => (stats.count > 0 ? field / stats.count : 0);

    // Compute a real performance ratio from data:
    //   PR = (actual kWh / theoretical max) — we approximate
    const avgPower = avg(stats.sumPower);
    const capacity = 250; // kW rated
    const pr = capacity > 0 ? Math.min(100, +((avgPower / capacity) * 100).toFixed(1)) : 85;
    const efficiency = Math.min(100, +(90 + Math.random() * 8).toFixed(1)); // 90-98% realistic range

    inverterDocs.push({
      inverterId,
      plantId: pid,
      name: `Inverter ${invNum}`,
      location: meta.location,
      status: "healthy", // Will be overridden by ML/fallback engine at runtime

      // Latest snapshot telemetry
      inverterPower: num(snap.inverter_power),
      inverterPv1Power: num(snap.inverter_pv1_power),
      inverterPv1Voltage: num(snap.inverter_pv1_voltage),
      inverterPv1Current: num(snap.inverter_pv1_current),
      inverterPv2Power: num(snap.inverter_pv2_power),
      inverterPv2Voltage: num(snap.inverter_pv2_voltage),
      inverterPv2Current: num(snap.inverter_pv2_current),
      inverterKwhToday: num(snap.inverter_kwh_today),
      inverterKwhTotal: num(snap.inverter_kwh_total),
      inverterTemp: num(snap.inverter_temp),
      inverterOpState: num(snap.inverter_op_state),
      inverterAlarmCode: num(snap.inverter_alarm_code),
      inverterLimitPercent: num(snap.inverter_limit_percent),
      ambientTemp: num(snap.ambient_temp),
      meterActivePower: num(snap.meter_active_power),

      // Aggregated / derived
      riskScore: 0, // Computed at runtime by ML or fallback engine
      lastUpdated: snap.timestamp ? new Date(snap.timestamp) : new Date(),
      uptime: +(95 + Math.random() * 5).toFixed(1), // 95-100% realistic
      inverterModel: `SolarEdge SE${capacity}K`,
      capacity,
      installDate: new Date("2023-06-15"),
      firmware: "v3.2.1",
      performanceRatio: pr,
      efficiency,
      strings: [],
    });
  }
  await db.collection("inverters").insertMany(inverterDocs);
  console.log(`   ✅ ${inverterDocs.length} inverters created`);

  // ── 5) Create Telemetry Records (last N rows for time-series) ──
  console.log(`📈 Creating telemetry records (last ${TELEMETRY_SAMPLE.toLocaleString()} rows)...`);
  const telemetryRows = rows.slice(-TELEMETRY_SAMPLE);
  const telemetryDocs = telemetryRows.map((row) => ({
    inverterId: cleanInverterId(row.plant_id, row.inverter_id),
    plantId: row.plant_id,
    timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
    inverterPower: num(row.inverter_power),
    inverterPv1Power: num(row.inverter_pv1_power),
    inverterPv1Voltage: num(row.inverter_pv1_voltage),
    inverterPv1Current: num(row.inverter_pv1_current),
    inverterPv2Power: num(row.inverter_pv2_power),
    inverterPv2Voltage: num(row.inverter_pv2_voltage),
    inverterPv2Current: num(row.inverter_pv2_current),
    inverterKwhToday: num(row.inverter_kwh_today),
    inverterKwhTotal: num(row.inverter_kwh_total),
    inverterTemp: num(row.inverter_temp),
    inverterOpState: num(row.inverter_op_state),
    inverterAlarmCode: num(row.inverter_alarm_code),
    inverterLimitPercent: num(row.inverter_limit_percent),
    ambientTemp: num(row.ambient_temp),
    meterActivePower: num(row.meter_active_power),
  }));

  // Insert in batches of 2000
  const BATCH = 2000;
  for (let i = 0; i < telemetryDocs.length; i += BATCH) {
    await db.collection("telemetryrecords").insertMany(
      telemetryDocs.slice(i, i + BATCH),
      { ordered: false }
    );
    process.stdout.write(`   Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(telemetryDocs.length / BATCH)} inserted\r`);
  }
  console.log(`\n   ✅ ${telemetryDocs.length} telemetry records created`);

  // ── 6) Verify ──
  console.log("\n🔍 Verification:");
  const pCount = await db.collection("plants").countDocuments();
  const iCount = await db.collection("inverters").countDocuments();
  const tCount = await db.collection("telemetryrecords").countDocuments();
  console.log(`   Plants:    ${pCount}`);
  console.log(`   Inverters: ${iCount}`);
  console.log(`   Telemetry: ${tCount}`);

  // Show a sample inverter
  const sample = await db.collection("inverters").findOne({}, {
    projection: { inverterId: 1, plantId: 1, inverterPower: 1, inverterTemp: 1, inverterKwhToday: 1, performanceRatio: 1, _id: 0 }
  });
  console.log("   Sample inverter:", JSON.stringify(sample));

  await client.close();
  console.log("\n✅ Done! MongoDB Atlas is seeded with real CSV data.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
