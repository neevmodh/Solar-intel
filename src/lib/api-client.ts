/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — API Client
 * ─────────────────────────────────────────────────────────
 * All data fetches go through real API routes backed by
 * MongoDB. Zero mock/static data — everything is dynamic.
 * ─────────────────────────────────────────────────────────
 */

import type {
  DashboardData,
  LiveEnergyData,
  AnalyticsData,
  AIAdvisorData,
  GridData,
  UserProfile,
  Inverter,
  MLPredictionResponse,
  Plant,
  ChatMessage,
  AgentAction,
  ImportResult,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  const json = await res.json();
  // Our apiSuccess wraps data in { success, data } — unwrap it
  return (json.data ?? json) as T;
}

/* ── Dashboard ─────────────────────────────────────────── */
export async function fetchDashboardData(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/api/dashboard");
}

/* ── Live Energy ───────────────────────────────────────── */
export async function fetchLiveEnergy(): Promise<LiveEnergyData> {
  return apiFetch<LiveEnergyData>("/api/live-energy");
}

/* ── Inverters ─────────────────────────────────────────── */
export async function fetchAllInverters(): Promise<Inverter[]> {
  return apiFetch<Inverter[]>("/api/inverters");
}

export async function fetchInverterDetail(id: string): Promise<Inverter> {
  return apiFetch<Inverter>(`/api/inverters/${id}`);
}

/* ── Analytics ─────────────────────────────────────────── */
export async function fetchAnalytics(): Promise<AnalyticsData> {
  return apiFetch<AnalyticsData>("/api/analytics");
}

/* ── AI Advisor (insights, anomalies, forecast, maintenance) */
export async function fetchAIAdvisor(): Promise<AIAdvisorData> {
  return apiFetch<AIAdvisorData>("/api/ai-advisor");
}

/* ── Grid / DISCOM ─────────────────────────────────────── */
export async function fetchGridData(): Promise<GridData> {
  return apiFetch<GridData>("/api/grid");
}

/* ── User Profile ──────────────────────────────────────── */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    return await apiFetch<UserProfile>("/api/user/profile");
  } catch {
    // Not authenticated — return a safe guest profile so the page still renders
    return {
      name: "Guest",
      email: "",
      role: "viewer",
      accountId: "",
      plan: "basic",
      planCost: 0,
      nextRenewal: "",
      devices: [],
      notifications: { email: false, sms: false, push: false, criticalAlerts: false, weeklyReport: false, maintenanceReminders: false },
    };
  }
}

/* ── ML Predictions ────────────────────────────────────── */
export async function fetchMLPredictions(): Promise<MLPredictionResponse> {
  return apiFetch<MLPredictionResponse>("/api/predict");
}

export async function fetchMLPredictionSingle(inverterData: Record<string, number | string>): Promise<{
  risk_score: number;
  risk_level: string;
  failure_predicted: boolean;
  top_factors: string[];
  recommended_action: string;
}> {
  const res = await fetch(`${BASE}/api/predict`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inverterData),
  });
  if (!res.ok) throw new Error(`ML predict failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json);
}

/* ── Plants ─────────────────────────────────────────────── */
export async function fetchAllPlants(): Promise<Plant[]> {
  const result = await apiFetch<{ plants: Plant[]; count: number }>("/api/plants");
  return result.plants || [];
}

export async function fetchPlantById(plantId: string): Promise<{ plant: Plant; inverterCount: number }> {
  return apiFetch<{ plant: Plant; inverterCount: number }>(`/api/plants?plantId=${plantId}`);
}

/* ── Chat / RAG ─────────────────────────────────────────── */
export async function sendChatMessage(
  message: string,
  sessionId: string
): Promise<{ sessionId: string; message: ChatMessage; agentMode: boolean; guardrailBlocked?: boolean; actions?: AgentAction[]; tickets?: Array<{ inverterId: string; severity: string; issue: string; recommendation: string }> }> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

export async function getChatHistory(sessionId: string): Promise<{ messages: ChatMessage[] }> {
  return apiFetch<{ messages: ChatMessage[] }>(`/api/chat?sessionId=${sessionId}`);
}

/* ── Import ─────────────────────────────────────────────── */
export async function importFile(file: File, type?: string): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (type) formData.append("type", type);

  const res = await fetch(`${BASE}/api/import`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Import failed");
  }
  return res.json();
}

/* ── Maintenance ────────────────────────────────────────── */
export interface MaintenanceTaskAPI {
  _id: string;
  taskId: string;
  inverterId: string;
  inverterName: string;
  plantId: string;
  task: string;
  status: "scheduled" | "in-progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  scheduledDate: string;
  completedDate?: string;
  startedDate?: string;
  estimatedDuration: string;
  assignedTo: string;
  notes: string;
  source: "ai" | "manual";
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceListResponse {
  tasks: MaintenanceTaskAPI[];
  stats: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export async function fetchMaintenanceTasks(filters?: {
  status?: string;
  priority?: string;
  inverterId?: string;
}): Promise<MaintenanceListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.inverterId) params.set("inverterId", filters.inverterId);
  const qs = params.toString();
  return apiFetch<MaintenanceListResponse>(`/api/maintenance${qs ? `?${qs}` : ""}`);
}

export async function apiCreateMaintenanceTask(data: {
  inverterId: string;
  inverterName: string;
  plantId?: string;
  task: string;
  priority: string;
  scheduledDate: string;
  estimatedDuration?: string;
  assignedTo?: string;
  notes?: string;
}): Promise<MaintenanceTaskAPI> {
  const res = await fetch(`${BASE}/api/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create task");
  }
  const json = await res.json();
  return (json.data ?? json) as MaintenanceTaskAPI;
}

export async function apiUpdateMaintenanceTask(
  taskId: string,
  data: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    notes?: string;
  }
): Promise<MaintenanceTaskAPI> {
  const res = await fetch(`${BASE}/api/maintenance/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update task");
  }
  const json = await res.json();
  return (json.data ?? json) as MaintenanceTaskAPI;
}

export async function apiDeleteMaintenanceTask(taskId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/maintenance/${taskId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function apiSyncAIMaintenanceTasks(
  tasks: Array<{
    id: string;
    inverterId: string;
    inverterName: string;
    task: string;
    priority: string;
    scheduledDate: string;
    estimatedDuration: string;
    assignedTo: string;
    notes: string;
  }>
): Promise<{ created: number; existing: number }> {
  const res = await fetch(`${BASE}/api/maintenance?sync=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error("Failed to sync tasks");
  const json = await res.json();
  return (json.data ?? json);
}
