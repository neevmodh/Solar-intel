/**
 * GET /api/health — Health check (public)
 */
import { connectDB, apiSuccess, apiError } from "@/backend";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();

    const dbState = mongoose.connection.readyState;
    const stateMap: Record<number, string> = {
      0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting",
    };

    return apiSuccess({
      service: "solar-intel-api",
      version: "1.0.0",
      status: "operational",
      timestamp: new Date().toISOString(),
      database: {
        status: stateMap[dbState] || "unknown",
        name: mongoose.connection.name || "solar-intel",
      },
    });
  } catch (err) {
    return apiError(`Health check failed: ${(err as Error).message}`, 503);
  }
}
