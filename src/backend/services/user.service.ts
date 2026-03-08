/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: User Service
 * ─────────────────────────────────────────────────────────
 */

import { connectDB } from "@/backend/config";
import { User } from "@/backend/models";
import logger from "@/backend/utils/logger";

export async function getUserProfile(userId: string) {
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) throw new Error("NOT_FOUND");

  // Default devices shown when the user has none stored yet
  const defaultDevices = [
    { id: "DEV-001", name: "Aurora-7 Block A Inverter", type: "inverter" as const, status: "online" as const, lastSeen: new Date().toISOString(), firmware: "v4.12.3" },
    { id: "DEV-002", name: "Smart Meter MTR-2023-001", type: "meter" as const, status: "online" as const, lastSeen: new Date().toISOString(), firmware: "v2.1.0" },
    { id: "DEV-003", name: "Tesla Powerwall 2", type: "battery" as const, status: "online" as const, lastSeen: new Date().toISOString(), firmware: "v21.44.1" },
    { id: "DEV-004", name: "Ambient Temp Sensor S1", type: "sensor" as const, status: "online" as const, lastSeen: new Date().toISOString(), firmware: "v1.3.2" },
    { id: "DEV-005", name: "Irradiance Sensor IR-01", type: "sensor" as const, status: "offline" as const, lastSeen: new Date(Date.now() - 86400000).toISOString(), firmware: "v1.2.8" },
  ];

  return {
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    accountId: user.accountId || "EESL-AHD-001",
    plan: user.plan,
    planCost: user.planCost,
    nextRenewal: user.nextRenewal || "15 April, 2026",
    notifications: user.notifications,
    devices: (user.devices && user.devices.length > 0) ? user.devices : defaultDevices,
    createdAt: user.createdAt,
  };
}

export async function updateUserProfile(
  userId: string,
  body: Record<string, unknown>
) {
  await connectDB();

  const allowedFields: Record<string, boolean> = { name: true, notifications: true };
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (allowedFields[key]) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("NO_VALID_FIELDS");
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) throw new Error("NOT_FOUND");

  logger.info("User profile updated", { userId, fields: Object.keys(updates) });

  return {
    name: updated.name,
    email: updated.email,
    notifications: updated.notifications,
  };
}
