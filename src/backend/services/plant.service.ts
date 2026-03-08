/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Plant Service
 * ─────────────────────────────────────────────────────────
 * All plant-related business logic.
 * Plants are the top-level entity; each plant contains
 * a fleet of inverters identified by plantId.
 */

import { connectDB } from "@/backend/config";
import { Plant, Inverter } from "@/backend/models";
import { getMLPredictions, type MLPrediction } from "./ml-prediction.service";
import logger from "@/backend/utils/logger";
import type { Plant as PlantType, RiskLevel } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map DB plant doc to frontend Plant type, enriched with computed metrics */
export function mapPlantToFrontend(
  plant: any,
  inverters: any[],
  mlPredictions?: MLPrediction[]
): PlantType {
  const mlMap = new Map<string, MLPrediction>();
  if (mlPredictions) {
    for (const p of mlPredictions) mlMap.set(p.inverter_id, p);
  }

  const totalPower = inverters.reduce((s, inv: any) => s + ((inv.inverterPower || 0) / 1000), 0);
  const avgPerf = inverters.length
    ? Math.round((inverters.reduce((s, inv: any) => s + (inv.performanceRatio || 0), 0) / inverters.length) * 10) / 10
    : 0;

  // Compute health score from DB inverter risk scores (primary) or ML predictions (secondary)
  let healthScore = 100;
  let worstRisk: RiskLevel = "low";

  // Primary: use DB-stored riskScore values (set by seed or import)
  const dbRisks = inverters
    .map((inv: any) => inv.riskScore || 0)
    .filter((r: number) => r > 0);

  if (dbRisks.length > 0) {
    const avgDbRisk = dbRisks.reduce((s: number, r: number) => s + r, 0) / inverters.length;
    healthScore = Math.round(100 - avgDbRisk);
    if (avgDbRisk >= 75) worstRisk = "critical";
    else if (avgDbRisk >= 50) worstRisk = "high";
    else if (avgDbRisk >= 25) worstRisk = "medium";
  } else if (mlPredictions && mlPredictions.length > 0) {
    // Secondary: use ML predictions if DB has no risk data
    const avgRisk = mlPredictions.reduce((s, p) => s + p.risk_score, 0) / mlPredictions.length;
    healthScore = Math.round((1 - avgRisk) * 100);
    if (avgRisk >= 0.75) worstRisk = "critical";
    else if (avgRisk >= 0.5) worstRisk = "high";
    else if (avgRisk >= 0.25) worstRisk = "medium";
  }

  return {
    id: plant.plantId,
    name: plant.name,
    location: plant.location,
    latitude: plant.latitude || 0,
    longitude: plant.longitude || 0,
    capacity: plant.capacity,
    area: plant.area || 0,
    commissionDate: plant.commissionDate?.toISOString?.() || new Date().toISOString(),
    status: plant.status || "active",
    inverterCount: inverters.length,
    description: plant.description || "",
    totalPower: Math.round(totalPower * 10) / 10,
    avgPerformance: avgPerf,
    healthScore,
    riskLevel: worstRisk,
  };
}

/** Get all plants with aggregated metrics */
export async function getAllPlants(): Promise<PlantType[]> {
  await connectDB();
  const dbPlants = await Plant.find({}).lean();

  if (dbPlants.length === 0) {
    logger.info("No plants found in DB");
    return [];
  }

  const allInverters = await Inverter.find({}).lean();
  const mlPredictions = await getMLPredictions(allInverters);

  const results: PlantType[] = [];
  for (const plant of dbPlants) {
    const plantInverters = allInverters.filter(
      (inv: any) => inv.plantId === (plant as any).plantId
    );
    const plantMLPreds = mlPredictions
      ? mlPredictions.filter((p) =>
          plantInverters.some((inv: any) => inv.inverterId === p.inverter_id)
        )
      : undefined;
    results.push(mapPlantToFrontend(plant, plantInverters, plantMLPreds));
  }

  return results;
}

/** Get a single plant by plantId with its inverters */
export async function getPlantById(plantId: string) {
  await connectDB();
  const plant = await Plant.findOne({ plantId }).lean();
  if (!plant) return null;

  const inverters = await Inverter.find({ plantId }).lean();
  const mlPredictions = await getMLPredictions(inverters);

  return {
    plant: mapPlantToFrontend(plant, inverters, mlPredictions ?? undefined),
    inverterCount: inverters.length,
  };
}

/** Create a new plant */
export async function createPlant(data: {
  plantId: string;
  name: string;
  location: string;
  capacity: number;
  latitude?: number;
  longitude?: number;
  area?: number;
  commissionDate?: string;
  description?: string;
}) {
  await connectDB();
  const existing = await Plant.findOne({ plantId: data.plantId });
  if (existing) throw new Error(`Plant ${data.plantId} already exists`);

  const plant = await Plant.create({
    plantId: data.plantId,
    name: data.name,
    location: data.location,
    capacity: data.capacity,
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    area: data.area || 0,
    commissionDate: data.commissionDate ? new Date(data.commissionDate) : new Date(),
    description: data.description || "",
    status: "active",
  });

  logger.info(`Plant created: ${data.plantId}`);
  return plant;
}
