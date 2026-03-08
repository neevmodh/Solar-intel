/**
 * GET /api/ai-advisor — Full AI advisor composite data
 */
import { NextRequest } from "next/server";
import { getAIAdvisorData, checkRateLimit, apiSuccess, apiError, logger } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`advisor:${ip}`, 20, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const data = await getAIAdvisorData();
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/ai-advisor failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
