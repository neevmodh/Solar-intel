/**
 * Solar Intel - API: POST /api/import
 * Accepts CSV or Excel file uploads for plant/inverter data.
 * Parses the file, validates columns, and creates records in MongoDB.
 * DELETES old records before importing new data.
 *
 * ── STRICT VALIDATION ──
 * Only the following formats are accepted:
 *
 * 1) TELEMETRY / DATASET FORMAT (master_refined.csv style):
 *    REQUIRED columns: plant_id, inverter_id, timestamp, inverter_power
 *    OPTIONAL columns: inverter_pv1_power, inverter_pv1_voltage, inverter_pv1_current,
 *      inverter_pv2_power, inverter_pv2_voltage, inverter_pv2_current,
 *      inverter_kwh_today, inverter_kwh_total, inverter_temp, inverter_op_state,
 *      inverter_alarm_code, inverter_limit_percent, ambient_temp, meter_active_power,
 *      failure_within_7d
 *
 * 2) PLANT FORMAT:
 *    REQUIRED columns: plant_id, name, location, capacity
 *    OPTIONAL columns: latitude, longitude, area, commission_date, description
 *
 * 3) INVERTER FORMAT:
 *    REQUIRED columns: inverter_id, plant_id, name
 *    OPTIONAL columns: location, status, inverter_power, inverter_pv1_power, ...
 *
 * File size limit: 50 MB. Max 1,000,000 rows.
 * Accepted extensions: .csv, .xlsx, .xls
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/backend/config";
import { Plant, Inverter, TelemetryRecord } from "@/backend/models";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_ROWS = 1_000_000;

// ── Schema definitions for strict validation ──

const TELEMETRY_REQUIRED = ["plant_id", "inverter_id", "timestamp", "inverter_power"];
const TELEMETRY_OPTIONAL = [
  "inverter_pv1_power", "inverter_pv1_voltage", "inverter_pv1_current",
  "inverter_pv2_power", "inverter_pv2_voltage", "inverter_pv2_current",
  "inverter_kwh_today", "inverter_kwh_total", "inverter_temp",
  "inverter_op_state", "inverter_alarm_code", "inverter_limit_percent",
  "ambient_temp", "meter_active_power", "failure_within_7d",
  "timestamp_date", "fail_rate",
];
const TELEMETRY_ALL = [...TELEMETRY_REQUIRED, ...TELEMETRY_OPTIONAL];

const PLANT_REQUIRED = ["plant_id", "name", "location", "capacity"];
const PLANT_OPTIONAL = ["latitude", "longitude", "area", "commission_date", "description", "status"];
const PLANT_ALL = [...PLANT_REQUIRED, ...PLANT_OPTIONAL];

const INVERTER_REQUIRED = ["inverter_id", "plant_id", "name"];
const INVERTER_OPTIONAL = [
  "location", "status", "model", "capacity", "install_date", "firmware",
  "inverter_power", "inverter_pv1_power", "inverter_pv1_voltage", "inverter_pv1_current",
  "inverter_pv2_power", "inverter_pv2_voltage", "inverter_pv2_current",
  "inverter_kwh_today", "inverter_kwh_total", "inverter_temp",
  "inverter_op_state", "inverter_alarm_code", "inverter_limit_percent",
  "ambient_temp", "meter_active_power",
  "risk_score", "performance_ratio", "efficiency", "uptime",
  "power_output", "power", "temperature", "temp", "kwh_today", "kwh_total",
  "daily_yield", "lifetime_yield", "op_state", "alarm_code",
  "plantid", "inverterid", "plant_name", "inverter_name", "inverter_model",
];
const INVERTER_ALL = [...INVERTER_REQUIRED, ...INVERTER_OPTIONAL];

interface ParsedRow {
  [key: string]: string | number;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCSVBuffer(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return result.data;
}

function parseExcelBuffer(buffer: Buffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet);
}

function detectImportType(rows: ParsedRow[]): "plant" | "inverter" | "telemetry" | "unknown" {
  if (rows.length === 0) return "unknown";
  const keys = Object.keys(rows[0]).map(normalizeKey);

  // If it has timestamp + inverter_power columns, it's telemetry/dataset format
  const hasTelemetry = keys.some((k) => k === "inverter_power" || k === "inverter_temp");
  const hasTimestamp = keys.some((k) => k === "timestamp");
  if (hasTelemetry && hasTimestamp) return "telemetry";

  if (keys.some((k) => k.includes("plant_id") || k.includes("plantid"))) {
    if (keys.some((k) => k.includes("inverter_id") || k.includes("inverterid"))) {
      return "inverter";
    }
    return "plant";
  }
  if (keys.some((k) => k.includes("inverter_id") || k.includes("inverterid"))) {
    return "inverter";
  }
  return "unknown";
}

/**
 * Strict schema validation — returns an array of error strings.
 * Empty array = valid.
 */
function validateSchema(
  rows: ParsedRow[],
  detectedType: "telemetry" | "plant" | "inverter"
): string[] {
  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("File contains no data rows.");
    return errors;
  }
  if (rows.length > MAX_ROWS) {
    errors.push(`File has ${rows.length.toLocaleString()} rows — maximum allowed is ${MAX_ROWS.toLocaleString()}.`);
    return errors;
  }

  const rawKeys = Object.keys(rows[0]);
  const keys = rawKeys.map(normalizeKey);

  let requiredCols: string[];
  let allAllowedCols: string[];
  let formatName: string;

  switch (detectedType) {
    case "telemetry":
      requiredCols = TELEMETRY_REQUIRED;
      allAllowedCols = TELEMETRY_ALL;
      formatName = "Telemetry Dataset";
      break;
    case "plant":
      requiredCols = PLANT_REQUIRED;
      allAllowedCols = PLANT_ALL;
      formatName = "Plant";
      break;
    case "inverter":
      requiredCols = INVERTER_REQUIRED;
      allAllowedCols = INVERTER_ALL;
      formatName = "Inverter";
      break;
  }

  // Check required columns
  const missing = requiredCols.filter((col) => !keys.includes(col));
  if (missing.length > 0) {
    errors.push(
      `Missing required columns for ${formatName} format: ${missing.join(", ")}. ` +
      `Required: ${requiredCols.join(", ")}`
    );
  }

  // Check for unknown columns
  const unknown = keys.filter((k) => !allAllowedCols.includes(k));
  if (unknown.length > 0) {
    // Warning, not blocking — just inform
    // (don't add to errors so it doesn't block import)
  }

  // Validate sample data types (first 10 rows)
  const sampleSize = Math.min(rows.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    const norm: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) norm[normalizeKey(k)] = v;

    if (detectedType === "telemetry") {
      if (norm.plant_id === undefined || norm.plant_id === null || String(norm.plant_id).trim() === "") {
        errors.push(`Row ${i + 2}: plant_id is empty.`);
        break;
      }
      if (norm.inverter_id === undefined || norm.inverter_id === null) {
        errors.push(`Row ${i + 2}: inverter_id is empty.`);
        break;
      }
      const power = Number(norm.inverter_power);
      if (norm.inverter_power !== undefined && norm.inverter_power !== "" && isNaN(power)) {
        errors.push(`Row ${i + 2}: inverter_power must be a number, got "${norm.inverter_power}".`);
        break;
      }
    }

    if (detectedType === "plant") {
      if (!norm.plant_id || String(norm.plant_id).trim() === "") {
        errors.push(`Row ${i + 2}: plant_id is empty.`);
        break;
      }
      if (!norm.name || String(norm.name).trim() === "") {
        errors.push(`Row ${i + 2}: name is empty.`);
        break;
      }
      const cap = Number(norm.capacity);
      if (isNaN(cap) || cap <= 0) {
        errors.push(`Row ${i + 2}: capacity must be a positive number, got "${norm.capacity}".`);
        break;
      }
    }

    if (detectedType === "inverter") {
      if (!norm.inverter_id && !norm.inverterid) {
        errors.push(`Row ${i + 2}: inverter_id is empty.`);
        break;
      }
      if (!norm.plant_id && !norm.plantid) {
        errors.push(`Row ${i + 2}: plant_id is empty.`);
        break;
      }
    }
  }

  return errors;
}

async function importPlants(rows: ParsedRow[]) {
  const results = { created: 0, deleted: 0, errors: [] as string[], warnings: [] as string[] };

  // Delete old plant records first
  const deleteResult = await Plant.deleteMany({});
  results.deleted = deleteResult.deletedCount;

  // Deduplicate by plant_id — take first occurrence
  const seen = new Set<string>();
  const uniqueRows: ParsedRow[] = [];
  for (const row of rows) {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) normalized[normalizeKey(k)] = v;
    const plantId = String(normalized.plant_id || normalized.plantid || "");
    if (!plantId || seen.has(plantId)) continue;
    seen.add(plantId);
    uniqueRows.push(row);
  }

  for (const row of uniqueRows) {
    try {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeKey(k)] = v;
      }

      const plantId = normalized.plant_id || normalized.plantid || `PLANT-${Date.now()}`;
      const name = normalized.name || normalized.plant_name || `${plantId}`;
      const location = normalized.location || "India";
      const capacity = Number(normalized.capacity) || 0;

      await Plant.create({
        plantId: String(plantId),
        name: String(name),
        location: String(location),
        capacity,
        latitude: Number(normalized.latitude) || 0,
        longitude: Number(normalized.longitude) || 0,
        area: Number(normalized.area) || 0,
        commissionDate: normalized.commission_date ? new Date(String(normalized.commission_date)) : new Date(),
        description: String(normalized.description || ""),
        status: "active" as const,
      });
      results.created++;
    } catch (err: unknown) {
      results.errors.push(`Row error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
  return results;
}

async function importInverters(rows: ParsedRow[]) {
  const results = { created: 0, deleted: 0, errors: [] as string[], warnings: [] as string[] };

  // Delete old inverter records first
  const deleteResult = await Inverter.deleteMany({});
  results.deleted = deleteResult.deletedCount;

  // Deduplicate by inverter_id — take first occurrence
  const seen = new Set<string>();
  const uniqueRows: ParsedRow[] = [];
  for (const row of rows) {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) normalized[normalizeKey(k)] = v;
    const inverterId = String(normalized.inverter_id || normalized.inverterid || "");
    if (!inverterId || seen.has(inverterId)) continue;
    seen.add(inverterId);
    uniqueRows.push(row);
  }

  for (const row of uniqueRows) {
    try {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeKey(k)] = v;
      }

      const inverterId = normalized.inverter_id || normalized.inverterid || `INV-${Date.now()}`;
      const plantId = normalized.plant_id || normalized.plantid || "PLANT-001";
      const name = normalized.name || normalized.inverter_name || `Inverter ${inverterId}`;

      await Inverter.create({
        inverterId: String(inverterId),
        plantId: String(plantId),
        name: String(name),
        location: String(normalized.location || "Unknown"),
        status: String(normalized.status || "healthy"),
        inverterPower: Number(normalized.inverter_power || normalized.power_output || normalized.power) || 0,
        inverterPv1Power: Number(normalized.inverter_pv1_power) || 0,
        inverterPv1Voltage: Number(normalized.inverter_pv1_voltage) || 0,
        inverterPv1Current: Number(normalized.inverter_pv1_current) || 0,
        inverterPv2Power: Number(normalized.inverter_pv2_power) || 0,
        inverterPv2Voltage: Number(normalized.inverter_pv2_voltage) || 0,
        inverterPv2Current: Number(normalized.inverter_pv2_current) || 0,
        inverterKwhToday: Number(normalized.inverter_kwh_today || normalized.kwh_today || normalized.daily_yield) || 0,
        inverterKwhTotal: Number(normalized.inverter_kwh_total || normalized.kwh_total || normalized.lifetime_yield) || 0,
        inverterTemp: Number(normalized.inverter_temp || normalized.temperature || normalized.temp) || 0,
        inverterOpState: Number(normalized.inverter_op_state || normalized.op_state) || 0,
        inverterAlarmCode: Number(normalized.inverter_alarm_code || normalized.alarm_code) || 0,
        inverterLimitPercent: Number(normalized.inverter_limit_percent) || 0,
        ambientTemp: Number(normalized.ambient_temp) || 0,
        meterActivePower: Number(normalized.meter_active_power) || 0,
        riskScore: Number(normalized.risk_score) || 0,
        performanceRatio: Number(normalized.performance_ratio) || 85,
        efficiency: Number(normalized.efficiency) || 95,
        uptime: Number(normalized.uptime) || 99,
        inverterModel: String(normalized.model || normalized.inverter_model || "Unknown"),
        capacity: Number(normalized.capacity) || 250,
        installDate: normalized.install_date ? new Date(String(normalized.install_date)) : new Date(),
        firmware: String(normalized.firmware || "v1.0.0"),
        strings: [],
      } as Record<string, unknown>);
      results.created++;

      // Update plant inverter count
      await Plant.updateOne({ plantId: String(plantId) }, { $inc: { inverterCount: 1 } });
    } catch (err: unknown) {
      results.errors.push(`Row error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
  return results;
}

/**
 * Import telemetry-style CSV (master_refined.csv format).
 * Creates Plants (deduplicated), Inverters (latest snapshot per inverter), and TelemetryRecords.
 * DELETES all old records first.
 */
async function importTelemetryDataset(rows: ParsedRow[]) {
  const results = {
    plantsCreated: 0, invertersCreated: 0, telemetryCreated: 0,
    deleted: { plants: 0, inverters: 0, telemetry: 0 },
    errors: [] as string[], warnings: [] as string[],
  };

  // Delete all old data
  const [dp, di, dt] = await Promise.all([
    Plant.deleteMany({}),
    Inverter.deleteMany({}),
    TelemetryRecord.deleteMany({}),
  ]);
  results.deleted = { plants: dp.deletedCount, inverters: di.deletedCount, telemetry: dt.deletedCount };

  // Normalize all rows once
  const normalizedRows = rows.map((row) => {
    const n: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) n[normalizeKey(k)] = v;
    return n;
  });

  // --- 1) Create Plants ---
  const plantIds = Array.from(new Set(normalizedRows.map((r) => String(r.plant_id || "")))).filter(Boolean);
  const PLANT_LOCATIONS: Record<string, { location: string; lat: number; lng: number }> = {
    "Plant 1": { location: "Rajasthan, India", lat: 26.9124, lng: 70.9001 },
    "Plant 2": { location: "Gujarat, India", lat: 23.0225, lng: 72.5714 },
    "Plant 3": { location: "Karnataka, India", lat: 12.9716, lng: 77.5946 },
    "Plant 4": { location: "Tamil Nadu, India", lat: 11.1271, lng: 78.6569 },
  };

  for (const pid of plantIds) {
    try {
      const plantInvCount = new Set(normalizedRows.filter((r) => String(r.plant_id) === pid).map((r) => String(r.inverter_id))).size;
      const loc = PLANT_LOCATIONS[pid] || { location: "India", lat: 20.5, lng: 78.9 };
      await Plant.create({
        plantId: pid,
        name: pid,
        location: loc.location,
        latitude: loc.lat,
        longitude: loc.lng,
        capacity: plantInvCount * 0.025, // ~25kW per inverter estimate
        inverterCount: plantInvCount,
        status: "active",
        description: `Solar plant with ${plantInvCount} inverters`,
      });
      results.plantsCreated++;
    } catch (err: unknown) {
      results.errors.push(`Plant ${pid}: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  // --- 2) Create Inverters (latest snapshot per inverter) ---
  const inverterSnapshots = new Map<string, Record<string, unknown>>();
  for (const row of normalizedRows) {
    const key = `${row.plant_id}__${row.inverter_id}`;
    // Keep the latest row (last row wins since CSV is chronological)
    inverterSnapshots.set(key, row);
  }

  const snapshotEntries = Array.from(inverterSnapshots.entries());
  for (const [, snap] of snapshotEntries) {
    try {
      const plantId = String(snap.plant_id || "");
      const rawInvId = String(snap.inverter_id || "0");
      const invNum = rawInvId.replace(/\.0$/, "");
      const inverterId = `INV-${plantId.replace(/\s+/g, "")}-${invNum}`;
      const loc = PLANT_LOCATIONS[plantId] || { location: "India" };

      await Inverter.create({
        inverterId,
        plantId,
        name: `Inverter ${invNum}`,
        location: loc.location,
        status: "healthy",
        inverterPower: Number(snap.inverter_power) || 0,
        inverterPv1Power: Number(snap.inverter_pv1_power) || 0,
        inverterPv1Voltage: Number(snap.inverter_pv1_voltage) || 0,
        inverterPv1Current: Number(snap.inverter_pv1_current) || 0,
        inverterPv2Power: Number(snap.inverter_pv2_power) || 0,
        inverterPv2Voltage: Number(snap.inverter_pv2_voltage) || 0,
        inverterPv2Current: Number(snap.inverter_pv2_current) || 0,
        inverterKwhToday: Number(snap.inverter_kwh_today) || 0,
        inverterKwhTotal: Number(snap.inverter_kwh_total) || 0,
        inverterTemp: Number(snap.inverter_temp) || 0,
        inverterOpState: Number(snap.inverter_op_state) || 0,
        inverterAlarmCode: Number(snap.inverter_alarm_code) || 0,
        inverterLimitPercent: Number(snap.inverter_limit_percent) || 0,
        ambientTemp: Number(snap.ambient_temp) || 0,
        meterActivePower: Number(snap.meter_active_power) || 0,
        riskScore: 0,
        performanceRatio: 85,
        efficiency: 95,
        uptime: 99,
        inverterModel: "Unknown",
        capacity: 250,
        strings: [],
      });
      results.invertersCreated++;
    } catch (err: unknown) {
      results.errors.push(`Inverter error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  // --- 3) Create Telemetry Records (sample: last 5000 rows to avoid overload) ---
  const telemetryRows = normalizedRows.slice(-5000);
  const telemetryBatch = [];
  for (const row of telemetryRows) {
    const plantId = String(row.plant_id || "");
    const rawInvId = String(row.inverter_id || "0");
    const invNum = rawInvId.replace(/\.0$/, "");
    const inverterId = `INV-${plantId.replace(/\s+/g, "")}-${invNum}`;

    telemetryBatch.push({
      inverterId,
      plantId,
      timestamp: row.timestamp ? new Date(String(row.timestamp)) : new Date(),
      inverterPower: Number(row.inverter_power) || 0,
      inverterPv1Power: Number(row.inverter_pv1_power) || 0,
      inverterPv1Voltage: Number(row.inverter_pv1_voltage) || 0,
      inverterPv1Current: Number(row.inverter_pv1_current) || 0,
      inverterPv2Power: Number(row.inverter_pv2_power) || 0,
      inverterPv2Voltage: Number(row.inverter_pv2_voltage) || 0,
      inverterPv2Current: Number(row.inverter_pv2_current) || 0,
      inverterKwhToday: Number(row.inverter_kwh_today) || 0,
      inverterKwhTotal: Number(row.inverter_kwh_total) || 0,
      inverterTemp: Number(row.inverter_temp) || 0,
      inverterOpState: Number(row.inverter_op_state) || 0,
      inverterAlarmCode: Number(row.inverter_alarm_code) || 0,
      inverterLimitPercent: Number(row.inverter_limit_percent) || 0,
      ambientTemp: Number(row.ambient_temp) || 0,
      meterActivePower: Number(row.meter_active_power) || 0,
    });
  }

  // Insert in batches of 500
  for (let i = 0; i < telemetryBatch.length; i += 500) {
    try {
      await TelemetryRecord.insertMany(telemetryBatch.slice(i, i + 500), { ordered: false });
    } catch (err: unknown) {
      results.errors.push(`Telemetry batch error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }
  results.telemetryCreated = telemetryBatch.length;

  return results;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const importType = formData.get("type") as string | null; // "plant" | "inverter" | auto

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── File size check ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: 50 MB.`,
      }, { status: 400 });
    }

    // ── Extension check ──
    const fileName = file.name.toLowerCase();
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const ext = fileName.substring(fileName.lastIndexOf("."));
    if (!validExtensions.includes(ext)) {
      return NextResponse.json({
        error: `Unsupported file format "${ext}". Accepted formats: CSV (.csv), Excel (.xlsx, .xls).`,
        acceptedFormats: validExtensions,
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rows: ParsedRow[];
    if (fileName.endsWith(".csv")) {
      rows = parseCSVBuffer(buffer);
    } else {
      rows = parseExcelBuffer(buffer);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "File is empty or has no data rows." }, { status: 400 });
    }

    const detectedType = (importType as "plant" | "inverter" | "telemetry" | null) || detectImportType(rows);

    if (detectedType === "unknown") {
      const foundCols = Object.keys(rows[0]).map(normalizeKey);
      return NextResponse.json({
        error: "Could not detect import type. Your file must contain specific columns.",
        hint: "Accepted formats:\n" +
          "• Telemetry: plant_id, inverter_id, timestamp, inverter_power (+ optional telemetry cols)\n" +
          "• Plant: plant_id, name, location, capacity\n" +
          "• Inverter: inverter_id, plant_id, name",
        detectedColumns: foundCols,
      }, { status: 400 });
    }

    // ── Strict schema validation ──
    const validationErrors = validateSchema(rows, detectedType);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: "File validation failed.",
        validationErrors,
        detectedType,
        hint: detectedType === "telemetry"
          ? `Telemetry format requires: ${TELEMETRY_REQUIRED.join(", ")}`
          : detectedType === "plant"
            ? `Plant format requires: ${PLANT_REQUIRED.join(", ")}`
            : `Inverter format requires: ${INVERTER_REQUIRED.join(", ")}`,
        rowCount: rows.length,
        detectedColumns: Object.keys(rows[0]).map(normalizeKey),
      }, { status: 400 });
    }

    if (detectedType === "telemetry") {
      const result = await importTelemetryDataset(rows);
      return NextResponse.json({
        success: true,
        type: "telemetry-dataset",
        plantsCreated: result.plantsCreated,
        invertersCreated: result.invertersCreated,
        telemetryCreated: result.telemetryCreated,
        deleted: result.deleted,
        errors: result.errors,
        warnings: result.warnings,
      });
    } else if (detectedType === "plant") {
      const result = await importPlants(rows);
      return NextResponse.json({
        success: true,
        type: "plant",
        plantsCreated: result.created,
        invertersCreated: 0,
        deleted: result.deleted,
        errors: result.errors,
        warnings: result.warnings,
      });
    } else if (detectedType === "inverter") {
      const result = await importInverters(rows);
      return NextResponse.json({
        success: true,
        type: "inverter",
        plantsCreated: 0,
        invertersCreated: result.created,
        deleted: result.deleted,
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return NextResponse.json({ error: "Unexpected import type" }, { status: 400 });
  } catch (err: unknown) {
    console.error("POST /api/import error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
