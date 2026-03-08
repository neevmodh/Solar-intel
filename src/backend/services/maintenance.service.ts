/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Maintenance Service
 * ─────────────────────────────────────────────────────────
 * Full CRUD + status transitions + email notifications
 * for maintenance tasks. Tasks can be AI-generated or
 * manually created.
 */

import { connectDB } from "@/backend/config";
import { MaintenanceTask, type IMaintenanceTask } from "@/backend/models";
import { sendMaintenanceReminder } from "@/backend/services/email.service";
import logger from "@/backend/utils/logger";

/* ── Types ── */
export interface CreateMaintenanceInput {
  inverterId: string;
  inverterName: string;
  plantId?: string;
  task: string;
  priority: "low" | "medium" | "high" | "critical";
  scheduledDate: string; // ISO date string
  estimatedDuration?: string;
  assignedTo?: string;
  notes?: string;
  source?: "ai" | "manual";
}

export interface UpdateMaintenanceInput {
  status?: "scheduled" | "in-progress" | "completed" | "overdue";
  priority?: "low" | "medium" | "high" | "critical";
  assignedTo?: string;
  notes?: string;
  scheduledDate?: string;
  estimatedDuration?: string;
  task?: string;
}

/* ── Get all tasks ── */
export async function getAllMaintenanceTasks(filters?: {
  status?: string;
  priority?: string;
  inverterId?: string;
}): Promise<IMaintenanceTask[]> {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filters?.status) query.status = filters.status;
  if (filters?.priority) query.priority = filters.priority;
  if (filters?.inverterId) query.inverterId = filters.inverterId;

  return MaintenanceTask.find(query)
    .sort({ scheduledDate: 1, priority: -1 })
    .lean();
}

/* ── Get single task ── */
export async function getMaintenanceTaskById(
  taskId: string
): Promise<IMaintenanceTask | null> {
  await connectDB();
  return MaintenanceTask.findOne({ taskId }).lean();
}

/* ── Create task ── */
export async function createMaintenanceTask(
  input: CreateMaintenanceInput,
  userEmail?: string,
  userName?: string
): Promise<IMaintenanceTask> {
  await connectDB();

  // Generate unique task ID
  const count = await MaintenanceTask.countDocuments();
  const taskId = `MT-${input.inverterId}-${Date.now().toString(36)}-${count}`;

  const task = await MaintenanceTask.create({
    taskId,
    inverterId: input.inverterId,
    inverterName: input.inverterName,
    plantId: input.plantId || "",
    task: input.task,
    status: "scheduled",
    priority: input.priority,
    scheduledDate: new Date(input.scheduledDate),
    estimatedDuration: input.estimatedDuration || "3 hours",
    assignedTo: input.assignedTo || "Engineering Team",
    notes: input.notes || "",
    source: input.source || "manual",
    emailSent: false,
  });

  logger.info("Maintenance task created", { taskId, inverterId: input.inverterId });

  // Send email notification
  if (userEmail) {
    try {
      const sent = await sendMaintenanceReminder({
        recipientName: userName || "Operator",
        recipientEmail: userEmail,
        inverterId: input.inverterId,
        inverterName: input.inverterName,
        maintenanceType: input.task,
        scheduledDate: new Date(input.scheduledDate).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        priority: input.priority === "critical" ? "high" : input.priority as "high" | "medium" | "low",
      });
      if (sent) {
        await MaintenanceTask.updateOne({ taskId }, { emailSent: true });
        logger.info("Maintenance email sent", { taskId, to: userEmail });
      }
    } catch (err) {
      logger.error("Failed to send maintenance email", { error: (err as Error).message });
    }
  }

  return task.toObject();
}

/* ── Update task (status transition + email) ── */
export async function updateMaintenanceTask(
  taskId: string,
  input: UpdateMaintenanceInput,
  userEmail?: string,
  userName?: string
): Promise<IMaintenanceTask | null> {
  await connectDB();

  const update: Record<string, unknown> = {};

  if (input.status) {
    update.status = input.status;
    if (input.status === "in-progress") update.startedDate = new Date();
    if (input.status === "completed") update.completedDate = new Date();
  }
  if (input.priority) update.priority = input.priority;
  if (input.assignedTo) update.assignedTo = input.assignedTo;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.scheduledDate) update.scheduledDate = new Date(input.scheduledDate);
  if (input.estimatedDuration) update.estimatedDuration = input.estimatedDuration;
  if (input.task) update.task = input.task;

  const task = await MaintenanceTask.findOneAndUpdate(
    { taskId },
    { $set: update },
    { new: true, lean: true }
  );

  if (!task) return null;

  logger.info("Maintenance task updated", { taskId, update: Object.keys(update) });

  // Send email on status transition
  if (input.status && userEmail) {
    try {
      const statusLabel =
        input.status === "in-progress"
          ? "▶️ Started"
          : input.status === "completed"
          ? "✅ Completed"
          : input.status === "overdue"
          ? "⚠️ Overdue"
          : "📋 Updated";

      await sendMaintenanceReminder({
        recipientName: userName || "Operator",
        recipientEmail: userEmail,
        inverterId: task.inverterId,
        inverterName: task.inverterName,
        maintenanceType: `[${statusLabel}] ${task.task}`,
        scheduledDate: new Date(task.scheduledDate).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        priority: (task.priority === "critical" ? "high" : task.priority) as "high" | "medium" | "low",
      });
      logger.info("Status change email sent", { taskId, status: input.status, to: userEmail });
    } catch (err) {
      logger.error("Failed to send status email", { error: (err as Error).message });
    }
  }

  return task;
}

/* ── Delete task ── */
export async function deleteMaintenanceTask(
  taskId: string
): Promise<boolean> {
  await connectDB();
  const result = await MaintenanceTask.deleteOne({ taskId });
  return result.deletedCount > 0;
}

/* ── Sync AI-generated tasks ── */
// Called to persist AI advisor maintenance suggestions into DB
export async function syncAIMaintenanceTasks(
  aiTasks: Array<{
    id: string;
    inverterId: string;
    inverterName: string;
    task: string;
    priority: string;
    scheduledDate: string;
    estimatedDuration: string;
    assignedTo: string;
    notes: string;
  }>,
  userEmail?: string,
  userName?: string
): Promise<{ created: number; existing: number }> {
  await connectDB();

  let created = 0;
  let existing = 0;

  for (const ai of aiTasks) {
    // Check if already synced (by inverterId + task combo, to avoid duplicates)
    const exists = await MaintenanceTask.findOne({
      inverterId: ai.inverterId,
      task: ai.task,
      status: { $in: ["scheduled", "in-progress"] },
    });

    if (exists) {
      existing++;
      continue;
    }

    await createMaintenanceTask(
      {
        inverterId: ai.inverterId,
        inverterName: ai.inverterName,
        task: ai.task,
        priority: ai.priority as "low" | "medium" | "high" | "critical",
        scheduledDate: ai.scheduledDate,
        estimatedDuration: ai.estimatedDuration,
        assignedTo: ai.assignedTo,
        notes: ai.notes,
        source: "ai",
      },
      userEmail,
      userName
    );
    created++;
  }

  logger.info("AI maintenance sync", { created, existing });
  return { created, existing };
}

/* ── Stats ── */
export async function getMaintenanceStats(): Promise<{
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
}> {
  await connectDB();

  const [total, scheduled, inProgress, completed, overdue] = await Promise.all([
    MaintenanceTask.countDocuments(),
    MaintenanceTask.countDocuments({ status: "scheduled" }),
    MaintenanceTask.countDocuments({ status: "in-progress" }),
    MaintenanceTask.countDocuments({ status: "completed" }),
    MaintenanceTask.countDocuments({ status: "overdue" }),
  ]);

  return { total, scheduled, inProgress, completed, overdue };
}
