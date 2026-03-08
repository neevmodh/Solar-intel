/**
 * GET  /api/predict         — batch predictions for all inverters
 * POST /api/predict         — single inverter prediction (body = inverter fields)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/backend/config";
import { Inverter as InverterModel } from "@/backend/models";
import { getMLPredictions, getMLPredictionSingle } from "@/backend/services/ml-prediction.service";

export async function GET() {
  try {
    await connectDB();
    const dbInverters = await InverterModel.find({}).lean();

    if (dbInverters.length === 0) {
      return NextResponse.json(
        { success: false, error: "No inverters found" },
        { status: 404 }
      );
    }

    const predictions = await getMLPredictions(dbInverters);

    if (!predictions) {
      return NextResponse.json(
        { success: false, error: "ML service unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        timestamp: new Date().toISOString(),
        model_version: "1.0.0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If body has inverter data, predict directly
    const prediction = await getMLPredictionSingle(body);

    if (!prediction) {
      return NextResponse.json(
        { success: false, error: "ML service unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: prediction });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
