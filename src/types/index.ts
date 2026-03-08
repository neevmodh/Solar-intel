/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Domain Types (Complete)
 * ─────────────────────────────────────────────────────────
 */

/* ── Core Enums ── */
export type InverterStatus = "healthy" | "warning" | "critical";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type MaintenanceStatus = "scheduled" | "in-progress" | "completed" | "overdue";
export type AnomalySeverity = "info" | "warning" | "critical";
export type PlantStatus = "active" | "maintenance" | "offline";

/* ── Plant ── */
export interface Plant {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity: number; // MW
  area: number; // hectares
  commissionDate: string;
  status: PlantStatus;
  inverterCount: number;
  description: string;
  // Aggregated metrics (computed at runtime)
  totalPower?: number;
  avgPerformance?: number;
  healthScore?: number;
  riskLevel?: RiskLevel;
}

/* ── Inverter ── */
export interface Inverter {
  id: string;
  plantId: string;
  name: string;
  location: string;
  status: InverterStatus;
  riskScore: number;
  lastUpdated: string;
  statusReason: string; // why the inverter is in its current status

  /* ── Real telemetry fields (match CSV / ML model inputs) ── */
  inverterPower: number;       // AC power output (W)
  inverterPv1Power: number;    // PV string 1 power (W)
  inverterPv1Voltage: number;  // PV string 1 voltage (V)
  inverterPv1Current: number;  // PV string 1 current (A)
  inverterPv2Power: number;    // PV string 2 power (W)
  inverterPv2Voltage: number;  // PV string 2 voltage (V)
  inverterPv2Current: number;  // PV string 2 current (A)
  inverterKwhToday: number;    // Daily energy yield (kWh)
  inverterKwhTotal: number;    // Lifetime energy yield (kWh)
  inverterTemp: number;        // Inverter temperature (C)
  inverterOpState: number;     // Operating state code
  inverterAlarmCode: number;   // Alarm code
  inverterLimitPercent: number;// Power limit percentage
  ambientTemp: number;         // Ambient temperature (C)
  meterActivePower: number;    // Grid meter active power (kW)

  /* ── Derived / display fields ── */
  performanceRatio: number;
  powerOutput: number;         // Alias: inverterPower in kW for display
  temperature: number;         // Alias: inverterTemp
  uptime: number;
  model: string;
  capacity: number; // kW rated
  installDate: string;
  firmware: string;
  efficiency: number; // percentage
  dailyYield: number;   // kWh (alias for inverterKwhToday)
  lifetimeYield: number; // MWh
  strings: InverterString[];
}

export interface InverterString {
  id: string;
  voltage: number;
  current: number;
  power: number;
  status: InverterStatus;
}

/* ── System Health ── */
export interface SystemHealth {
  totalInverters: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  avgPerformanceRatio: number;
  totalPowerOutput: number;
  systemUptime: number;
  predictedFailures: number;
}

/* ── Performance Trend ── */
export interface PerformanceTrend {
  date: string;
  performanceRatio: number;
  expectedRatio: number;
  powerOutput: number;
}

/* ── AI Insight ── */
export interface AIInsight {
  id: string;
  inverterId: string;
  inverterName: string;
  riskLevel: RiskLevel;
  summary: string;
  reasoning: string;
  recommendations: string[];
  confidence: number;
  generatedAt: string;
}

/* ── Dashboard Aggregate ── */
export interface DashboardData {
  systemHealth: SystemHealth;
  inverters: Inverter[];
  performanceTrends: PerformanceTrend[];
  aiInsights: AIInsight[];
}

/* ── Live Energy (Real-time page) ── */
export interface LiveEnergyData {
  solarPower: number; // kW current
  loadPower: number; // kW current
  gridVoltage: number;
  gridFrequency: number;
  batteryLevel: number; // 0-100
  batteryStatus: "charging" | "discharging" | "idle";
  batteryTimeRemaining: string;
  isExporting: boolean;
  gridExport: number; // kW
  gridImport: number; // kW
  timestamp: string;
  waveformData: WaveformPoint[];
  todaySummary: TodaySummary;
}

export interface WaveformPoint {
  time: string;
  solar: number;
  load: number;
}

export interface TodaySummary {
  totalGenerated: number; // kWh
  totalConsumed: number; // kWh
  netGridPosition: number; // kWh (+export, -import)
  selfSufficiency: number; // percentage
  peakSolarHour: string;
  peakLoadHour: string;
  co2Avoided: number; // kg
}

/* ── Analytics ── */
export interface AnalyticsData {
  dailyGeneration: DailyGeneration[];
  monthlyComparison: MonthlyComparison[];
  inverterRanking: InverterRanking[];
  degradationAnalysis: DegradationPoint[];
  heatmapData: HeatmapCell[];
  energyMix: EnergyMixPoint[];
}

export interface DailyGeneration {
  date: string;
  generated: number;
  consumed: number;
  exported: number;
  imported: number;
}

export interface MonthlyComparison {
  month: string;
  thisYear: number;
  lastYear: number;
  target: number;
}

export interface InverterRanking {
  id: string;
  name: string;
  performance: number;
  yield: number;
  rank: number;
}

export interface DegradationPoint {
  month: string;
  actual: number;
  expected: number;
  degradation: number; // percentage
}

export interface HeatmapCell {
  hour: number;
  day: string;
  value: number;
}

export interface EnergyMixPoint {
  date: string;
  solar: number;
  grid: number;
  battery: number;
}

/* ── Grid / DISCOM ── */
export interface GridData {
  netMeteringStatus: "approved" | "pending" | "rejected";
  discomName: string;
  accountId: string;
  meterId: string;
  feedInTariff: number; // ₹/kWh
  contractValid: string;
  exportEarnings: number; // ₹
  syncQuality: number;
  voltageStability: number;
  frequencyStability: number;
  monthlyNetMetering: NetMeteringMonth[];
  gridEvents: GridEvent[];
}

export interface NetMeteringMonth {
  month: string;
  imported: number; // kWh
  exported: number; // kWh
  netAmount: number; // ₹
}

export interface GridEvent {
  id: string;
  timestamp: string;
  type: "outage" | "voltage-sag" | "frequency-deviation" | "sync-loss" | "export-limit";
  severity: AnomalySeverity;
  duration: number; // seconds
  description: string;
}

/* ── AI Advisor (Full) ── */
export interface AIAdvisorData {
  insights: AIInsight[];
  anomalies: Anomaly[];
  forecast: SolarForecast[];
  maintenanceSchedule: MaintenanceItem[];
  riskTimeline: RiskTimelinePoint[];
  healthScore: number; // 0-100
  alertCount: { critical: number; warning: number; info: number };
}

export interface Anomaly {
  id: string;
  inverterId: string;
  inverterName: string;
  timestamp: string;
  severity: AnomalySeverity;
  parameter: string;
  expectedValue: number;
  actualValue: number;
  unit: string;
  description: string;
  isResolved: boolean;
}

export interface SolarForecast {
  date: string;
  hour: number;
  predicted: number; // kW
  confidence: number;
  weather: "sunny" | "partly-cloudy" | "cloudy" | "rainy";
  irradiance: number; // W/m²
  temperature: number;
}

export interface MaintenanceItem {
  id: string;
  inverterId: string;
  inverterName: string;
  task: string;
  status: MaintenanceStatus;
  priority: RiskLevel;
  scheduledDate: string;
  estimatedDuration: string;
  assignedTo: string;
  notes: string;
}

export interface RiskTimelinePoint {
  date: string;
  riskScore: number;
  events: string[];
}

/* ── Settings / Profile ── */

/* ── ML Predictions ── */
export interface ShapExplanation {
  feature: string;           // Raw feature name (e.g., "inverter_temp")
  label: string;             // Human-readable label (e.g., "Inverter temperature")
  value: string | null;      // Formatted value (e.g., "64.5°C", "250kW")
  contribution: number;      // Percentage contribution (0-100)
  direction: "positive" | "negative";  // Increases or decreases failure risk
  impact: "high" | "medium" | "low";   // Impact magnitude
  description: string;       // Full human-readable explanation
}

export interface MLPrediction {
  inverter_id: string;
  plant_id: string;
  risk_score: number; // 0-1 probability
  risk_level: RiskLevel;
  failure_predicted: boolean;
  status: string;
  top_factors: string[];
  shap_explanation?: ShapExplanation[];
  recommended_action: string;
}

export interface MLPredictionResponse {
  predictions: MLPrediction[];
  timestamp: string;
  model_version: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  accountId: string;
  plan: "basic" | "premium" | "pro";
  planCost: number;
  nextRenewal: string;
  devices: DeviceInfo[];
  notifications: NotificationPref;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: "inverter" | "meter" | "battery" | "sensor";
  status: "online" | "offline";
  lastSeen: string;
  firmware: string;
}

export interface NotificationPref {
  email: boolean;
  sms: boolean;
  push: boolean;
  criticalAlerts: boolean;
  weeklyReport: boolean;
  maintenanceReminders: boolean;
}

/* ── Chat / RAG ── */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  sources?: ChatSource[];
  agentAction?: AgentAction;
}

export interface ChatSource {
  type: "inverter" | "plant" | "telemetry" | "ml-prediction";
  id: string;
  name: string;
  relevance: number;
}

export interface AgentAction {
  type: "risk-assessment" | "maintenance-ticket" | "data-retrieval" | "anomaly-scan";
  status: "pending" | "running" | "completed" | "failed";
  description: string;
  result?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  context: {
    plantId?: string;
    inverterId?: string;
  };
}

/* ── Import ── */
export interface ImportResult {
  success: boolean;
  plantsCreated: number;
  invertersCreated: number;
  errors: string[];
  warnings: string[];
}

