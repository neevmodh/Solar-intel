/**
 * GET /api/grid — Grid / DISCOM data
 */
import { NextRequest } from "next/server";
import { getGridData, checkRateLimit, apiSuccess, apiError, logger } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`grid:${ip}`, 30, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const data = await getGridData();
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/grid failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
