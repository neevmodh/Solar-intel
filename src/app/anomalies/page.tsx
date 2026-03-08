/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Anomaly Detection Page (Production-Ready)
 * ─────────────────────────────────────────────────────────
 * Features:
 *  • Real-time ML + rule-based anomaly detection from MongoDB
 *  • Plant-level filtering via dropdown
 *  • Severity filter (all / critical / warning / info)
 *  • Show/hide resolved toggle
 *  • Acknowledge & resolve actions with visual state
 *  • Auto-refresh with configurable interval & countdown
 *  • 14-day fleet risk trend chart
 *  • Export anomalies to CSV
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, pageTransition } from "@/lib/motion";
import { fetchAIAdvisor, fetchAllPlants, fetchAllInverters } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@tremor/react";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  Thermometer,
  Zap,
  Radio,
  Filter,
  BarChart3,
  RefreshCcw,
  Download,
  Building2,
  Clock,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { AnomalySeverity, Anomaly } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

/* ── Severity configuration ── */
const severityConfig: Record<
  AnomalySeverity,
  { color: string; icon: React.ReactNode; bg: string }
> = {
  critical: {
    color: "text-red-400",
    icon: <ShieldAlert className="h-4 w-4 text-red-400" />,
    bg: "bg-red-500/10 border-red-500/20",
  },
  warning: {
    color: "text-yellow-400",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  info: {
    color: "text-blue-400",
    icon: <Activity className="h-4 w-4 text-blue-400" />,
    bg: "bg-blue-500/10 border-blue-500/20",
  },
};

const parameterIcons: Record<string, React.ReactNode> = {
  "Junction Temperature": <Thermometer className="h-4 w-4" />,
  "THD (Current)": <Radio className="h-4 w-4" />,
  "MPPT Efficiency": <Zap className="h-4 w-4" />,
  "String Voltage Mismatch": <BarChart3 className="h-4 w-4" />,
  "Efficiency Dip": <TrendingDown className="h-4 w-4" />,
  "Fan Speed Increase": <Activity className="h-4 w-4" />,
  "Conversion Efficiency": <Zap className="h-4 w-4" />,
  "Performance Ratio": <BarChart3 className="h-4 w-4" />,
  "ML Failure Prediction": <ShieldAlert className="h-4 w-4" />,
  "Alarm Code": <AlertTriangle className="h-4 w-4" />,
};

const REFRESH_INTERVAL = 30_000;

export default function AnomalyDetectPage() {
  const [filter, setFilter] = useState<"all" | AnomalySeverity>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [plantFilter, setPlantFilter] = useState<string>("all");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  /* ── Data fetching ── */
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["aiAdvisor"],
    queryFn: fetchAIAdvisor,
    staleTime: 20_000,
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: plants } = useQuery({
    queryKey: ["plants"],
    queryFn: fetchAllPlants,
    staleTime: 60_000,
  });

  const { data: inverters } = useQuery({
    queryKey: ["inverters"],
    queryFn: fetchAllInverters,
    staleTime: 60_000,
  });

  /* ── Countdown timer ── */
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL / 1000);
    const iv = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [dataUpdatedAt]);

  /* ── Inverter→plant mapping ── */
  const inverterPlantMap = useMemo(() => {
    const map = new Map<string, string>();
    if (inverters) for (const inv of inverters) map.set(inv.id, inv.plantId);
    return map;
  }, [inverters]);

  /* ── Local actions ── */
  const handleAcknowledge = useCallback((id: string) => {
    setAcknowledgedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleResolve = useCallback((id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
  }, []);

  /* ── Export CSV ── */
  const handleExportCSV = useCallback(() => {
    if (!data) return;
    const rows = [
      ["ID", "Inverter", "Parameter", "Severity", "Expected", "Actual", "Unit", "Description", "Timestamp", "Status"].join(","),
      ...data.anomalies.map((a) =>
        [a.id, `"${a.inverterName}"`, `"${a.parameter}"`, a.severity, a.expectedValue, a.actualValue, a.unit,
         `"${a.description.replace(/"/g, '""')}"`, a.timestamp,
         resolvedIds.has(a.id) ? "resolved" : acknowledgedIds.has(a.id) ? "acknowledged" : "active",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anomalies-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, acknowledgedIds, resolvedIds]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Enrich anomalies with local workflow state ── */
  const enrichedAnomalies: (Anomaly & { localStatus: "active" | "acknowledged" | "resolved" })[] =
    data.anomalies.map((a) => ({
      ...a,
      isResolved: a.isResolved || resolvedIds.has(a.id),
      localStatus: resolvedIds.has(a.id) ? "resolved"
        : acknowledgedIds.has(a.id) ? "acknowledged"
        : a.isResolved ? "resolved" : "active",
    }));

  /* ── Apply filters ── */
  const filtered = enrichedAnomalies
    .filter((a) => filter === "all" || a.severity === filter)
    .filter((a) => showResolved || a.localStatus !== "resolved")
    .filter((a) => {
      if (plantFilter === "all") return true;
      return inverterPlantMap.get(a.inverterId) === plantFilter;
    });

  const totalCritical = enrichedAnomalies.filter((a) => a.severity === "critical" && a.localStatus !== "resolved").length;
  const totalWarning = enrichedAnomalies.filter((a) => a.severity === "warning" && a.localStatus !== "resolved").length;
  const totalAcknowledged = enrichedAnomalies.filter((a) => a.localStatus === "acknowledged").length;
  const totalResolved = enrichedAnomalies.filter((a) => a.localStatus === "resolved").length;

  /* ── Trend chart from risk timeline ── */
  const trendData = data.riskTimeline.map((pt) => ({
    date: pt.date,
    "Risk Score": pt.riskScore,
  }));

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 p-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="Anomaly Detection" /></h1>
          <p className="text-sm text-muted-foreground">
            <TranslatedText text="Real-time ML + rule-based anomaly detection across your fleet" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-surface-2 rounded-md px-2.5 py-1.5 border border-border/40">
            <RefreshCcw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
            <TranslatedText text="Refresh in" /> {countdown}s
          </div>
          <button
            onClick={handleExportCSV}
            title="Export anomalies CSV"
            className="flex items-center gap-1.5 text-[10px] font-medium bg-surface-2 rounded-md px-2.5 py-1.5 border border-border/40 hover:bg-surface-3 transition-colors"
          >
            <Download className="h-3 w-3" /> <TranslatedText text="Export CSV" />
          </button>
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20" variant="outline">
            <ShieldAlert className="mr-1 h-3 w-3" />
            {totalCritical + totalWarning} <TranslatedText text="Active" />
          </Badge>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Critical", count: totalCritical, icon: ShieldAlert, color: "red", desc: "Requires immediate action" },
          { label: "Warning", count: totalWarning, icon: AlertTriangle, color: "yellow", desc: "Trending toward threshold" },
          { label: "Acknowledged", count: totalAcknowledged, icon: Eye, color: "blue", desc: "Under investigation" },
          { label: "Resolved", count: totalResolved, icon: CheckCircle2, color: "emerald", desc: "Successfully mitigated" },
        ].map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl",
                  item.color === "red" && "bg-red-500/10", item.color === "yellow" && "bg-yellow-500/10",
                  item.color === "blue" && "bg-blue-500/10", item.color === "emerald" && "bg-emerald-500/10"
                )}>
                  <item.icon className={cn("h-6 w-6",
                    item.color === "red" && "text-red-400", item.color === "yellow" && "text-yellow-400",
                    item.color === "blue" && "text-blue-400", item.color === "emerald" && "text-emerald-400"
                  )} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground"><TranslatedText text={item.desc} /></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Risk Trend Chart ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-red-400" />
              <TranslatedText text="14-Day Fleet Risk Trend" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-40"
              data={trendData}
              index="date"
              categories={["Risk Score"]}
              colors={["rose"]}
              valueFormatter={(v: number) => `${v.toFixed(0)}`}
              showLegend={false}
              showGridLines={false}
              showAnimation
              curveType="monotone"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" /> <TranslatedText text="Plant" />:
        </div>
        <select
          value={plantFilter}
          onChange={(e) => setPlantFilter(e.target.value)}
          title="Filter by plant"
          className="rounded-md px-2.5 py-1.5 text-xs font-medium bg-surface-2 text-foreground border border-border/40 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
        >
          <option value="all">All Plants</option>
          {plants?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-border/40" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> <TranslatedText text="Severity" />:
        </div>
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
              filter === f
                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                : "bg-surface-2 text-muted-foreground border-border/40 hover:bg-surface-3"
            )}
          >
            {f === "all" ? <TranslatedText text="All" /> : <TranslatedText text={f.charAt(0).toUpperCase() + f.slice(1)} />}
          </button>
        ))}
        <button
          onClick={() => setShowResolved(!showResolved)}
          title={showResolved ? "Hide resolved anomalies" : "Show resolved anomalies"}
          className={cn(
            "ml-auto rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            showResolved
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-surface-2 text-muted-foreground border-border/40"
          )}
        >
          <TranslatedText text={showResolved ? "Showing Resolved" : "Hiding Resolved"} />
        </button>
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-muted-foreground">
        <TranslatedText text="Showing" /> <span className="font-semibold text-foreground">{filtered.length}</span> <TranslatedText text="of" /> {enrichedAnomalies.length} <TranslatedText text="anomalies" />
        {plantFilter !== "all" && plants && (
          <> — <span className="text-purple-400">{plants.find((p) => p.id === plantFilter)?.name}</span></>
        )}
      </p>

      {/* ── Anomaly Cards ── */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {filtered.map((anomaly) => {
          const config = severityConfig[anomaly.severity];
          const deviation = anomaly.expectedValue !== 0
            ? ((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue) * 100 : 0;
          const isOver = anomaly.actualValue > anomaly.expectedValue;

          return (
            <motion.div key={anomaly.id} variants={fadeUp}>
              <Card className={cn(
                "border-border/40 bg-surface-2 transition-opacity",
                anomaly.localStatus === "resolved" && "opacity-50",
                anomaly.localStatus === "acknowledged" && "border-l-2 border-l-blue-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", config.bg)}>
                      {parameterIcons[anomaly.parameter] || config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold"><TranslatedText text={anomaly.parameter} /></span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.bg, config.color)}>
                          <TranslatedText text={anomaly.severity} />
                        </Badge>
                        {anomaly.localStatus === "acknowledged" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Eye className="mr-0.5 h-2.5 w-2.5" /> <TranslatedText text="Acknowledged" />
                          </Badge>
                        )}
                        {anomaly.localStatus === "resolved" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> <TranslatedText text="Resolved" />
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{anomaly.inverterName}</span>
                      </div>

                      <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                        <TranslatedText text={anomaly.description} />
                      </p>

                      {/* Deviation Bar */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span><TranslatedText text="Expected" />: {anomaly.expectedValue}{anomaly.unit}</span>
                            <span><TranslatedText text="Actual" />: {anomaly.actualValue}{anomaly.unit}</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-4 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500",
                                anomaly.severity === "critical" ? "bg-red-500" :
                                anomaly.severity === "warning" ? "bg-yellow-500" : "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(Math.abs(deviation), 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs font-bold", config.color)}>
                          {isOver ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
                        </div>
                      </div>

                      {/* Footer: timestamp + actions */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </div>
                        {anomaly.localStatus === "active" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcknowledge(anomaly.id)}
                              title="Acknowledge this anomaly"
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                            >
                              <Eye className="h-3 w-3" /> <TranslatedText text="Acknowledge" />
                            </button>
                            <button
                              onClick={() => handleResolve(anomaly.id)}
                              title="Resolve this anomaly"
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                            >
                              <ShieldCheck className="h-3 w-3" /> <TranslatedText text="Resolve" />
                            </button>
                          </div>
                        )}
                        {anomaly.localStatus === "acknowledged" && (
                          <button
                            onClick={() => handleResolve(anomaly.id)}
                            title="Mark this anomaly as resolved"
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <ShieldCheck className="h-3 w-3" /> <TranslatedText text="Mark Resolved" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500/50" />
            <p className="text-sm font-medium"><TranslatedText text="No anomalies match your filter" /></p>
            <p className="text-xs mt-1"><TranslatedText text="Try adjusting the plant or severity filter" /></p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
