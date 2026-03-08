/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: User Model (Mongoose)
 * ─────────────────────────────────────────────────────────
 * Stores Google OAuth users with role-based access.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  googleId: string;
  name: string;
  email: string;
  image: string;
  role: "admin" | "operator" | "viewer";
  accountId: string;
  plan: "basic" | "premium" | "pro";
  planCost: number;
  nextRenewal: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    criticalAlerts: boolean;
    weeklyReport: boolean;
    maintenanceReminders: boolean;
  };
  devices: Array<{
    id: string;
    name: string;
    type: "inverter" | "meter" | "battery" | "sensor";
    status: "online" | "offline";
    lastSeen: string;
    firmware: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: "" },
    role: {
      type: String,
      enum: ["admin", "operator", "viewer"],
      default: "operator",
    },
    accountId: { type: String, default: "" },
    plan: {
      type: String,
      enum: ["basic", "premium", "pro"],
      default: "premium",
    },
    planCost: { type: Number, default: 2999 },
    nextRenewal: { type: String, default: "" },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      criticalAlerts: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      maintenanceReminders: { type: Boolean, default: true },
    },
    devices: {
      type: [
        {
          id: { type: String },
          name: { type: String },
          type: { type: String, enum: ["inverter", "meter", "battery", "sensor"] },
          status: { type: String, enum: ["online", "offline"], default: "online" },
          lastSeen: { type: String },
          firmware: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
