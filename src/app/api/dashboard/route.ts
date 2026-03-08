/**
 * GET /api/dashboard — Aggregate dashboard data
 */
import { NextRequest } from "next/server";
import { getDashboardData, checkRateLimit, apiSuccess, apiError, logger } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`dashboard:${ip}`, 60, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const data = await getDashboardData();
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/dashboard failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
