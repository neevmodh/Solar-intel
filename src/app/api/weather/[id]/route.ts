/**
 * GET /api/weather/[id] — returns weather for an inverter (current + hourly)
 * This endpoint is read-only and safe to call from the frontend; it does not
 * change ML training data. If the inverter has latitude/longitude fields they
 * will be used; otherwise defaults from env are used.
 */
import { NextRequest } from "next/server";
import { getWeatherForInverter } from "@/backend/services/weather.service";
import { getAuthenticatedUser, apiError, apiSuccess, logger } from "@/backend";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    // Allow only authenticated users to fetch site weather (simple auth guard)
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const weather = await getWeatherForInverter(params.id);
    return apiSuccess(weather);
  } catch (err) {
    logger.error("GET /api/weather/[id] failed", { error: (err as Error).message });
    return apiError((err as Error).message || "Weather lookup failed", 500);
  }
}
