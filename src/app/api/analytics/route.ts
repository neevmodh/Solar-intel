/**
 * GET /api/analytics — Analytics data
 */
import { NextRequest } from "next/server";
import { getAnalyticsData, checkRateLimit, apiSuccess, apiError, logger } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`analytics:${ip}`, 30, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const data = await getAnalyticsData();
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/analytics failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
