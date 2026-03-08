/**
 * GET    /api/inverters/[id] — Fetch one inverter
 * PATCH  /api/inverters/[id] — Update inverter fields (owner or admin)
 * DELETE /api/inverters/[id] — Delete inverter + telemetry (admin only)
 */
import { NextRequest } from "next/server";
import {
  getInverterById, updateInverter, deleteInverter,
  getAuthenticatedUser, apiSuccess, apiError, logger,
} from "@/backend";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const inverter = await getInverterById(params.id, auth.user.id);
    if (!inverter) return apiError(`Inverter '${params.id}' not found`, 404);
    return apiSuccess(inverter);
  } catch (err) {
    logger.error("GET /api/inverters/[id] failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const updated = await updateInverter(params.id, auth.user.id, body);
    return apiSuccess(updated);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "FORBIDDEN")  return apiError("You don't have permission to edit this inverter", 403);
    if (msg === "NOT_FOUND")  return apiError(`Inverter '${params.id}' not found`, 404);
    logger.error("PATCH /api/inverters/[id] failed", { error: msg });
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    await deleteInverter(params.id, auth.user.id);
    return apiSuccess({ deleted: true, inverterId: params.id });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "FORBIDDEN")  return apiError("Admin access required to delete inverters", 403);
    if (msg === "NOT_FOUND")  return apiError(`Inverter '${params.id}' not found`, 404);
    logger.error("DELETE /api/inverters/[id] failed", { error: msg });
    return apiError("Internal server error", 500);
  }
}
