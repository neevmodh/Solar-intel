/**
 * POST /api/telemetry/ingest — Bulk telemetry ingestion
 */
import { NextRequest } from "next/server";
import {
  ingestTelemetry,
  getAuthenticatedUser, checkRateLimit,
  apiSuccess, apiError, logger,
} from "@/backend";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = checkRateLimit(`ingest:${ip}`, 20, 60_000);
    if (!rl.allowed) return apiError("Ingestion rate limit exceeded", 429);

    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return apiError("Body must contain a non-empty 'records' array", 400);
    }
    if (body.records.length > 1000) {
      return apiError("Maximum 1000 records per batch", 400);
    }

    const result = await ingestTelemetry(body.records);
    return apiSuccess(result, 201);
  } catch (err) {
    logger.error("POST /api/telemetry/ingest failed", { error: (err as Error).message });
    return apiError("Ingestion failed", 500);
  }
}
