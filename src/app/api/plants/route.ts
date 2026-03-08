/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — API: GET /api/plants
 * ─────────────────────────────────────────────────────────
 * Returns all plants with aggregated metrics.
 * GET /api/plants?plantId=PLANT-001 returns a single plant.
 */

import { NextResponse } from "next/server";
import { getAllPlants, getPlantById, createPlant } from "@/backend/services/plant.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get("plantId");

    if (plantId) {
      const result = await getPlantById(plantId);
      if (!result) {
        return NextResponse.json({ error: "Plant not found" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const plants = await getAllPlants();
    return NextResponse.json({ plants, count: plants.length });
  } catch (err: unknown) {
    console.error("GET /api/plants error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plantId, name, location, capacity, latitude, longitude, area, commissionDate, description } = body;

    if (!plantId || !name || !location || !capacity) {
      return NextResponse.json(
        { error: "Missing required fields: plantId, name, location, capacity" },
        { status: 400 }
      );
    }

    const plant = await createPlant({
      plantId, name, location, capacity, latitude, longitude, area, commissionDate, description,
    });

    return NextResponse.json({ success: true, plant }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/plants error:", err);
    const errMsg = err instanceof Error ? err.message : "Internal error";
    const status = errMsg.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
