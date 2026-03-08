/**
 * POST /api/inverters/[id]/analyze — ML Analysis / Rule-based fallback
 */
import { NextRequest } from "next/server";
import {
  analyzeInverter,
  getAuthenticatedUser, checkRateLimit,
  apiSuccess, apiError, logger,
} from "@/backend";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`analyze:${ip}`, 10, 60_000);
    if (!rl.allowed) return apiError("Analysis rate limit exceeded", 429);

    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const data = await analyzeInverter(params.id);
    return apiSuccess(data);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NOT_FOUND") return apiError(`Inverter ${params.id} not found`, 404);
    logger.error("POST /api/inverters/[id]/analyze failed", { error: msg });
    return apiError("Internal server error", 500);
  }
}
