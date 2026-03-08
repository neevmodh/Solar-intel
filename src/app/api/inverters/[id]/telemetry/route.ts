/**
 * GET /api/inverters/[id]/telemetry — Telemetry for an inverter
 */
import { NextRequest } from "next/server";
import {
  getInverterTelemetry,
  getAuthenticatedUser, checkRateLimit,
  apiSuccess, apiError, logger,
} from "@/backend";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(ip, 30, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    const data = await getInverterTelemetry(params.id, days);
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/inverters/[id]/telemetry failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}
