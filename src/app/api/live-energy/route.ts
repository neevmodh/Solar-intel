/**
 * GET /api/live-energy — Real-time energy flow data
 */
import { NextRequest } from "next/server";
import { getLiveEnergyData, checkRateLimit, apiSuccess, apiError, logger } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`live:${ip}`, 120, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const data = await getLiveEnergyData();
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/live-energy failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
