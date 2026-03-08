/**
 * GET  /api/inverters — Fetch all inverters
 * POST /api/inverters — Create a new inverter (admin only)
 */
import { NextRequest } from "next/server";
import {
  getAllInverters, createInverter,
  getAuthenticatedUser, checkRateLimit,
  apiSuccess, apiError, logger,
} from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(ip, 60, 60_000);
    if (!rl.allowed) return apiError("Rate limit exceeded", 429);

    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const data = await getAllInverters(auth.user.id);
    return apiSuccess(data);
  } catch (err) {
    logger.error("GET /api/inverters failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const result = await createInverter(auth.user.id, body);
    return apiSuccess(result, 201);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "FORBIDDEN") return apiError("Admin access required", 403);
    if (msg.startsWith("MISSING_FIELD:")) return apiError(`Missing required field: ${msg.split(":")[1]}`, 400);
    logger.error("POST /api/inverters failed", { error: msg });
    if ((err as { code?: number }).code === 11000) return apiError("Inverter with this ID already exists", 409);
    return apiError("Internal server error", 500);
  }
}
