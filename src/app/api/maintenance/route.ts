/**
 * GET  /api/maintenance       — List all maintenance tasks (with optional filters)
 * POST /api/maintenance       — Create a new maintenance task
 * POST /api/maintenance?sync  — Sync AI-generated tasks into DB
 */
import { NextRequest } from "next/server";
import {
  getAllMaintenanceTasks, createMaintenanceTask, syncAIMaintenanceTasks,
  getMaintenanceStats, getAuthenticatedUser, apiSuccess, apiError, logger,
} from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const priority = url.searchParams.get("priority") || undefined;
    const inverterId = url.searchParams.get("inverterId") || undefined;
    const statsOnly = url.searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await getMaintenanceStats();
      return apiSuccess(stats);
    }

    const tasks = await getAllMaintenanceTasks({ status, priority, inverterId });
    const stats = await getMaintenanceStats();

    return apiSuccess({ tasks, stats });
  } catch (err) {
    logger.error("GET /api/maintenance failed", { error: (err as Error).message });
    return apiError("Failed to fetch maintenance tasks", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const userEmail = auth.error ? undefined : auth.user.email;
    const userName = auth.error ? undefined : auth.user.name;

    const url = new URL(req.url);
    const isSync = url.searchParams.get("sync") === "true";

    const body = await req.json();

    if (isSync) {
      // Sync AI-generated maintenance tasks
      const result = await syncAIMaintenanceTasks(
        body.tasks || [],
        userEmail,
        userName
      );
      return apiSuccess(result);
    }

    // Validate required fields
    const { inverterId, inverterName, task, priority, scheduledDate } = body;
    if (!inverterId || !task || !priority || !scheduledDate) {
      return apiError("Missing required fields: inverterId, task, priority, scheduledDate", 400);
    }

    const created = await createMaintenanceTask(
      {
        inverterId,
        inverterName: inverterName || inverterId,
        plantId: body.plantId,
        task,
        priority,
        scheduledDate,
        estimatedDuration: body.estimatedDuration,
        assignedTo: body.assignedTo,
        notes: body.notes,
        source: body.source || "manual",
      },
      userEmail,
      userName
    );

    return apiSuccess(created, 201);
  } catch (err) {
    logger.error("POST /api/maintenance failed", { error: (err as Error).message });
    return apiError("Failed to create maintenance task", 500);
  }
}
