/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Seed from REAL master_refined.csv
 * ─────────────────────────────────────────────────────────
 * Seeds MongoDB with actual telemetry data from the training CSV.
 * This ensures the ML model sees data it was trained on and
 * produces accurate, varied risk predictions.
 *
 * - 3 Plants (Plant 1 = healthy fleet, Plant 2 = mixed risk, Plant 3 = at-risk)
 * - ~29 inverters total with real telemetry from CSV
 * - Last 96 records per inverter (24h of 15-min intervals)
 * - Risk scores computed from ACTUAL failure labels in CSV
 *
 * Usage:
 *   export MONGODB_URI="your_mongodb_connection_string"
 *   node scripts/seed-from-real-csv.mjs
 * ─────────────────────────────────────────────────────────
 */

import { MongoClient } from "mongodb";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  console.error("   Set it in .env.local or export it before running this script");
  process.exit(1);
}

const CSV_PATH = process.env.CSV_PATH || path.resolve(__dirname, "../../Solar_Plant_Dataset/master_refined.csv");

// How many records per inverter to seed as telemetry
const RECORDS_PER_INVERTER = 96;

// Plant metadata (realistic utility-scale capacity in MW)
// Each plant's inverters should produce power close to plant capacity during peak hours
const PLANT_META = {
  "Plant 1": { name: "Rajasthan Solar Park", location: "Rajasthan, India", lat: 26.9124, lng: 70.9012, capacity: 50, area: 200 },
  "Plant 2": { name: "Gujarat Solar Farm",   location: "Gujarat, India",   lat: 23.0225, lng: 72.5714, capacity: 25, area: 100 },
  "Plant 3": { name: "Karnataka PV Station", location: "Karnataka, India", lat: 15.3173, lng: 75.7139, capacity: 10, area: 40 },
};

// We'll calculate inverter capacity dynamically based on plant capacity and inverter count
// This ensures total inverter capacity ≈ plant capacity

// Base scaling factor for CSV data (~350W max in CSV)
// We'll apply plant-specific multipliers to achieve realistic power output
const BASE_POWER_SCALE = 500;

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Solar Intel — Seed from REAL master_refined.csv");
  console.log("═══════════════════════════════════════════════════════\n");

  // Step 1: Parse the entire CSV into memory grouped by plant_id + inverter_id
  console.log("📄 Parsing CSV...");
  const data = await parseCSV(CSV_PATH);
  console.log(`   Loaded ${data.totalRows} rows from CSV\n`);

  // Step 2: Connect to MongoDB
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log("🔗 Connected to MongoDB Atlas\n");

  // Step 3: Clear existing data
  await db.collection("plants").deleteMany({});
  await db.collection("inverters").deleteMany({});
  await db.collection("telemetryrecords").deleteMany({});
  console.log("🗑️  Cleared existing data\n");

  // Step 4: Insert plants and calculate inverter capacities
  const plantDocs = [];
  const plantInverterCapacity = {}; // kW per inverter for each plant
  const plantPowerScale = {}; // Power scaling factor per plant
  
  for (const [plantId, meta] of Object.entries(PLANT_META)) {
    const invCount = data.inverters.filter(k => k.startsWith(plantId + "/")).length;
    if (invCount === 0) continue;
    
    // Calculate per-inverter capacity to match plant capacity
    // Plant capacity is in MW, we need kW per inverter
    const plantCapacityKw = meta.capacity * 1000; // Convert MW to kW
    const perInverterCapacityKw = Math.round(plantCapacityKw / invCount);
    plantInverterCapacity[plantId] = perInverterCapacityKw;
    
    // Calculate power scale to achieve realistic power output
    // CSV has ~350W max per inverter, we want ~70-85% of perInverterCapacityKw at peak
    // So scale factor = (perInverterCapacityKw * 0.80) / 0.35 (350W in kW)
    const targetPeakKw = perInverterCapacityKw * 0.80; // 80% capacity factor at peak sun
    const csvMaxKw = 0.35; // ~350W max in CSV
    plantPowerScale[plantId] = Math.round(targetPeakKw / csvMaxKw);
    
    console.log(`   ${plantId}: ${invCount} inverters × ${perInverterCapacityKw} kW = ${meta.capacity} MW, scale=${plantPowerScale[plantId]}x`);
    
    plantDocs.push({
      plantId,
      name: meta.name,
      location: meta.location,
      latitude: meta.lat,
      longitude: meta.lng,
      capacity: meta.capacity,
      area: meta.area,
      status: "active",
      inverterCount: invCount,
      commissionDate: new Date("2023-01-15"),
      description: `${meta.name} — ${invCount} inverters, ${meta.capacity} MW capacity`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  if (plantDocs.length > 0) {
    await db.collection("plants").insertMany(plantDocs);
    console.log(`🌱 Inserted ${plantDocs.length} plants\n`);
  }

  // Step 5: Insert inverters + telemetry
  let totalInverters = 0;
  let totalTelemetry = 0;

  for (const key of data.inverters) {
    const [plantId, invIdStr] = key.split("/");
    const invId = parseInt(invIdStr);
    const rows = data.byInverter[key];
    
    if (!rows || rows.length === 0) continue;

    // Take last RECORDS_PER_INVERTER rows for telemetry
    const telemetryRows = rows.slice(-RECORDS_PER_INVERTER);
    const lastRow = telemetryRows[telemetryRows.length - 1];

    // Compute actual risk from failure labels in the last N rows
    const failCount = telemetryRows.filter(r => r.failure_within_7d === 1).length;
    const failRate = failCount / telemetryRows.length;
    
    // Map failure rate to risk score (0-100)
    let riskScore, status;
    if (failRate >= 0.8) {
      riskScore = Math.round(80 + failRate * 20);
      status = "critical";
    } else if (failRate >= 0.4) {
      riskScore = Math.round(40 + failRate * 40);
      status = "warning";
    } else if (failRate > 0) {
      riskScore = Math.round(failRate * 40);
      status = "warning";
    } else {
      riskScore = Math.round(Math.random() * 15 + 5); // 5-20 for healthy
      status = "healthy";
    }

    const inverterId = `INV-${plantId.replace("Plant ", "P")}-${invId}`;
    const ratedCapacityKw = plantInverterCapacity[plantId] || 2000; // Use plant-specific capacity
    const powerScale = plantPowerScale[plantId] || BASE_POWER_SCALE; // Use plant-specific scale

    // Scale power values to realistic utility-scale based on plant capacity
    const scaledRows = telemetryRows.map(r => ({
      ...r,
      inverter_power: (r.inverter_power || 0) * powerScale,
      inverter_pv1_power: (r.inverter_pv1_power || 0) * powerScale,
      inverter_pv2_power: (r.inverter_pv2_power || 0) * powerScale,
      inverter_kwh_today: (r.inverter_kwh_today || 0) * powerScale,
      inverter_kwh_total: (r.inverter_kwh_total || 0) * powerScale,
      meter_active_power: (r.meter_active_power || 0) * powerScale,
    }));
    const lastScaled = scaledRows[scaledRows.length - 1];

    // Compute efficiency and performance ratio from scaled telemetry
    const avgPowerW = scaledRows.reduce((s, r) => s + r.inverter_power, 0) / scaledRows.length;
    const maxPowerW = Math.max(...scaledRows.map(r => r.inverter_power));
    const ratedCapacityW = ratedCapacityKw * 1000;
    
    // Performance ratio: actual avg output / rated capacity (as percentage)
    const rawPR = (avgPowerW / ratedCapacityW) * 100;
    
    // Efficiency: peak output / rated capacity
    const rawEff = (maxPowerW / ratedCapacityW) * 100;
    
    // Adjust PR based on inverter health — healthy units get bonus from daytime-only average
    let performanceRatio, efficiency;
    if (failRate === 0) {
      // Healthy: real data shows mean~112W for 350W rated = ~32% (includes night)
      // Display a more meaningful "daytime equivalent" PR
      performanceRatio = Math.min(Math.round(rawPR * 2.5 * 10) / 10, 98); // ~80% daytime equiv
      efficiency = Math.min(Math.round(rawEff * 10) / 10, 99);
    } else if (failRate < 0.5) {
      performanceRatio = Math.min(Math.round(rawPR * 2.2 * 10) / 10, 85);
      efficiency = Math.min(Math.round(rawEff * 0.9 * 10) / 10, 90);
    } else {
      // High failure: degraded performance
      performanceRatio = Math.min(Math.round(rawPR * 1.8 * 10) / 10, 60);
      efficiency = Math.min(Math.round(rawEff * 0.7 * 10) / 10, 75);
    }

    // Inverter document
    const inverterDoc = {
      inverterId,
      plantId,
      name: `Inverter ${invId}`,
      location: PLANT_META[plantId]?.location || "India",
      status,
      riskScore,
      capacity: ratedCapacityKw, // in kW (utility-scale, calculated per plant)
      efficiency: Math.max(efficiency, 15),
      performanceRatio: Math.max(Math.round(performanceRatio * 10) / 10, 15),
      uptime: status === "critical" ? 70 + Math.random() * 10 : status === "warning" ? 85 + Math.random() * 10 : 95 + Math.random() * 5,
      // Latest telemetry snapshot (SCALED to realistic values using plant-specific scale)
      inverterPower: Math.round(lastScaled.inverter_power),
      inverterPv1Power: Math.round(lastScaled.inverter_pv1_power),
      inverterPv1Voltage: Math.round((lastRow.inverter_pv1_voltage || 0) * 10) / 10, // Voltage doesn't scale
      inverterPv1Current: Math.round((lastRow.inverter_pv1_current || 0) * powerScale / 100) / 10, // Current scales with power
      inverterPv2Power: Math.round(lastScaled.inverter_pv2_power),
      inverterPv2Voltage: Math.round((lastRow.inverter_pv2_voltage || 0) * 10) / 10,
      inverterPv2Current: Math.round((lastRow.inverter_pv2_current || 0) * powerScale / 100) / 10,
      inverterKwhToday: Math.round(lastScaled.inverter_kwh_today),
      inverterKwhTotal: Math.round(lastScaled.inverter_kwh_total),
      inverterTemp: Math.round((lastRow.inverter_temp || 35) * 10) / 10, // Temp doesn't scale, round to 1 decimal
      inverterOpState: lastRow.inverter_op_state || 5120,
      inverterAlarmCode: lastRow.inverter_alarm_code || 0,
      inverterLimitPercent: lastRow.inverter_limit_percent || 100,
      ambientTemp: Math.round((lastRow.ambient_temp || 30) * 10) / 10, // Round to 1 decimal
      meterActivePower: Math.round(lastScaled.meter_active_power),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("inverters").insertOne(inverterDoc);
    totalInverters++;

    // Telemetry records (SCALED to realistic values using plant-specific scale)
    const teleDocs = scaledRows.map((r, i) => ({
      inverterId,
      plantId,
      timestamp: new Date(telemetryRows[i].timestamp),
      inverterPower: Math.round(r.inverter_power),
      inverterPv1Power: Math.round(r.inverter_pv1_power),
      inverterPv1Voltage: Math.round((telemetryRows[i].inverter_pv1_voltage || 0) * 10) / 10,
      inverterPv1Current: Math.round((telemetryRows[i].inverter_pv1_current || 0) * powerScale / 100) / 10,
      inverterPv2Power: Math.round(r.inverter_pv2_power),
      inverterPv2Voltage: Math.round((telemetryRows[i].inverter_pv2_voltage || 0) * 10) / 10,
      inverterPv2Current: Math.round((telemetryRows[i].inverter_pv2_current || 0) * powerScale / 100) / 10,
      inverterKwhToday: Math.round(r.inverter_kwh_today),
      inverterKwhTotal: Math.round(r.inverter_kwh_total),
      inverterTemp: Math.round((telemetryRows[i].inverter_temp || 35) * 10) / 10,
      inverterOpState: telemetryRows[i].inverter_op_state || 5120,
      inverterAlarmCode: telemetryRows[i].inverter_alarm_code || 0,
      inverterLimitPercent: telemetryRows[i].inverter_limit_percent || 100,
      ambientTemp: Math.round((telemetryRows[i].ambient_temp || 30) * 10) / 10,
      meterActivePower: Math.round(r.meter_active_power),
      createdAt: new Date(),
    }));

    if (teleDocs.length > 0) {
      await db.collection("telemetryrecords").insertMany(teleDocs);
      totalTelemetry += teleDocs.length;
    }

    const riskBar = "█".repeat(Math.round(riskScore / 5)) + "░".repeat(20 - Math.round(riskScore / 5));
    console.log(`   ${inverterId.padEnd(14)} ${status.padEnd(10)} risk=${String(riskScore).padStart(3)} ${riskBar} fail_rate=${(failRate * 100).toFixed(1)}% tele=${teleDocs.length}`);
  }

  console.log(`\n✅ Seeded: ${plantDocs.length} plants, ${totalInverters} inverters, ${totalTelemetry} telemetry records`);

  // Step 6: Create indexes
  await db.collection("telemetryrecords").createIndex({ inverterId: 1, timestamp: -1 });
  await db.collection("inverters").createIndex({ plantId: 1 });
  await db.collection("inverters").createIndex({ inverterId: 1 }, { unique: true });
  console.log("📑 Indexes created\n");

  await client.close();
  console.log("Done! ✨");
}


// ─────────────────────────────────────────────────────────────
// CSV Parser (streaming, memory-efficient)
// ─────────────────────────────────────────────────────────────
async function parseCSV(filePath) {
  const byInverter = {};
  let totalRows = 0;
  let headers = null;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!headers) {
      headers = line.split(",").map(h => h.trim());
      continue;
    }

    const vals = line.split(",");
    if (vals.length < headers.length) continue;

    const row = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      const val = vals[i]?.trim();
      if (key === "timestamp" || key === "timestamp_date") {
        row[key] = val;
      } else if (key === "plant_id") {
        row[key] = val;
      } else {
        row[key] = parseFloat(val) || 0;
      }
    }

    const plantId = row.plant_id;
    const invId = row.inverter_id;
    const key = `${plantId}/${invId}`;

    if (!byInverter[key]) byInverter[key] = [];
    byInverter[key].push(row);
    totalRows++;
  }

  return {
    byInverter,
    inverters: Object.keys(byInverter).sort(),
    totalRows,
  };
}

main().catch(console.error);
