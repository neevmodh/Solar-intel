/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Plant Model (Mongoose)
 * ─────────────────────────────────────────────────────────
 * Represents a solar plant that contains multiple inverters.
 * Plant → Inverter is a 1:N relationship via plantId.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlant extends Document {
  plantId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity: number; // Total MW capacity
  area: number; // Hectares
  commissionDate: Date;
  status: "active" | "maintenance" | "offline";
  inverterCount: number;
  description: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlantSchema = new Schema<IPlant>(
  {
    plantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    capacity: { type: Number, required: true }, // MW
    area: { type: Number, default: 0 }, // hectares
    commissionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "maintenance", "offline"], default: "active" },
    inverterCount: { type: Number, default: 0 },
    description: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

PlantSchema.index({ ownerId: 1, plantId: 1 });

export const Plant: Model<IPlant> =
  mongoose.models.Plant || mongoose.model<IPlant>("Plant", PlantSchema);
