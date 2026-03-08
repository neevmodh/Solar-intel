/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: MaintenanceTask Model (Mongoose)
 * ─────────────────────────────────────────────────────────
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IMaintenanceTask extends Document {
  _id: mongoose.Types.ObjectId;
  taskId: string;          // e.g. "MT-INV-P1-5-0"
  inverterId: string;      // e.g. "INV-P1-5"
  inverterName: string;
  plantId: string;
  task: string;            // "Preventive Maintenance", "Emergency Inspection", etc.
  status: "scheduled" | "in-progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  scheduledDate: Date;
  completedDate?: Date;
  startedDate?: Date;
  estimatedDuration: string; // "3 hours", "6 hours"
  assignedTo: string;
  notes: string;
  source: "ai" | "manual";  // Was it AI-generated or manually created?
  emailSent: boolean;        // Whether email notification was sent
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceTaskSchema = new Schema<IMaintenanceTask>(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    inverterId: { type: String, required: true, index: true },
    inverterName: { type: String, default: "" },
    plantId: { type: String, default: "" },
    task: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "overdue"],
      default: "scheduled",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date },
    startedDate: { type: Date },
    estimatedDuration: { type: String, default: "3 hours" },
    assignedTo: { type: String, default: "Engineering Team" },
    notes: { type: String, default: "" },
    source: { type: String, enum: ["ai", "manual"], default: "manual" },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MaintenanceTaskSchema.index({ status: 1, scheduledDate: 1 });
MaintenanceTaskSchema.index({ inverterId: 1, status: 1 });

export const MaintenanceTask: Model<IMaintenanceTask> =
  mongoose.models.MaintenanceTask ||
  mongoose.model<IMaintenanceTask>("MaintenanceTask", MaintenanceTaskSchema);
