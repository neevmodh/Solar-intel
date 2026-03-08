/**
 * PATCH  /api/maintenance/[id] — Update a maintenance task (status, priority, etc.)
 * DELETE /api/maintenance/[id] — Delete a maintenance task
 */
import { NextRequest } from "next/server";
import {
  getMaintenanceTaskById, updateMaintenanceTask, deleteMaintenanceTask,
  getAuthenticatedUser, apiSuccess, apiError, logger,
} from "@/backend";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getMaintenanceTaskById(id);
    if (!task) return apiError("Maintenance task not found", 404);
    return apiSuccess(task);
  } catch (err) {
    logger.error("GET /api/maintenance/[id] failed", { error: (err as Error).message });
    return apiError("Failed to fetch maintenance task", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser();
    const userEmail = auth.error ? undefined : auth.user.email;
    const userName = auth.error ? undefined : auth.user.name;

    const body = await req.json();

    const updated = await updateMaintenanceTask(id, body, userEmail, userName);
    if (!updated) return apiError("Maintenance task not found", 404);

    return apiSuccess(updated);
  } catch (err) {
    logger.error("PATCH /api/maintenance/[id] failed", { error: (err as Error).message });
    return apiError("Failed to update maintenance task", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteMaintenanceTask(id);
    if (!deleted) return apiError("Maintenance task not found", 404);
    return apiSuccess({ deleted: true, taskId: id });
  } catch (err) {
    logger.error("DELETE /api/maintenance/[id] failed", { error: (err as Error).message });
    return apiError("Failed to delete maintenance task", 500);
  }
}
