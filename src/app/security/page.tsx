/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — DISCOM / Grid Intelligence Page (Production-Ready)
 * ─────────────────────────────────────────────────────────
 * Features:
 *  • Real-time grid sync data from MongoDB telemetry
 *  • Event severity filter (all / critical / warning / info)
 *  • Auto-refresh 60s with countdown timer
 *  • Grid health score computed from sync + voltage + frequency
 *  • Circular gauges for sync quality / voltage / frequency
 *  • Monthly net metering import vs export bar chart
 *  • Earnings area chart with cumulative total
 *  • Grid event timeline with severity badges & duration
 *  • Connection health indicator cards
 *  • Export grid report to CSV
 *  • Fully accessible (title attrs on interactive elements)
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, pageTransition } from "@/lib/motion";
import { fetchGridData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, BarChart } from "@tremor/react";
import {
  Network,
  CheckCircle2,
  Zap,
  Activity,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  IndianRupee,
  Gauge,
  ShieldCheck,
  RefreshCcw,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { TranslatedText } from "@/components/ui/translated-text";
import type { AnomalySeverity } from "@/types";

/* ── Constants ── */
const REFRESH_INTERVAL = 60_000;

/* ── severity styles ── */
const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};
const severityDot: Record<string, string> = {
  critical: "bg-red-400",
  warning: "bg-yellow-400",
  info: "bg-blue-400",
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  outage: <Zap className="h-4 w-4" />,
  "voltage-sag": <Activity className="h-4 w-4" />,
  "frequency-deviation": <Radio className="h-4 w-4" />,
  "sync-loss": <AlertTriangle className="h-4 w-4" />,
  "export-limit": <Gauge className="h-4 w-4" />,
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function getHealthGrade(score: number): { label: string; color: string } {
  if (score >= 95) return { label: "Excellent", color: "text-emerald-400" };
  if (score >= 90) return { label: "Good", color: "text-blue-400" };
  if (score >= 80) return { label: "Fair", color: "text-yellow-400" };
  return { label: "Poor", color: "text-red-400" };
}

export default function DISCOMGridPage() {
  /* ── State ── */
  const [eventFilter, setEventFilter] = useState<"all" | AnomalySeverity>("all");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["gridData"],
    queryFn: fetchGridData,
    staleTime: 30_000,
    refetchInterval: REFRESH_INTERVAL,
  });

  /* ── Countdown timer ── */
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL / 1000);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  /* ── Derived metrics ── */
  const gridHealthScore = useMemo(() => {
    if (!data) return 0;
    return Math.round(((data.syncQuality + data.voltageStability + data.frequencyStability) / 3) * 10) / 10;
  }, [data]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    if (eventFilter === "all") return data.gridEvents;
    return data.gridEvents.filter((e) => e.severity === eventFilter);
  }, [data, eventFilter]);

  const eventStats = useMemo(() => {
    if (!data) return { critical: 0, warning: 0, info: 0, total: 0 };
    const stats = { critical: 0, warning: 0, info: 0, total: data.gridEvents.length };
    data.gridEvents.forEach((e) => {
      if (e.severity in stats) stats[e.severity as keyof typeof stats]++;
    });
    return stats;
  }, [data]);

  const totalNetEarnings = useMemo(() => {
    if (!data) return 0;
    return data.monthlyNetMetering.reduce((s, m) => s + Math.max(0, m.netAmount), 0);
  }, [data]);

  const totalExported = useMemo(() => {
    if (!data) return 0;
    return data.monthlyNetMetering.reduce((s, m) => s + m.exported, 0);
  }, [data]);

  const totalImported = useMemo(() => {
    if (!data) return 0;
    return data.monthlyNetMetering.reduce((s, m) => s + m.imported, 0);
  }, [data]);

  /* ── Export CSV ── */
  const handleExportCSV = useCallback(() => {
    if (!data) return;
    const lines = [
      "Section,Field,Value",
      `Connection,DISCOM,${data.discomName}`,
      `Connection,Account ID,${data.accountId}`,
      `Connection,Meter ID,${data.meterId}`,
      `Connection,Feed-in Tariff,₹${data.feedInTariff}/kWh`,
      `Connection,Contract Valid,${data.contractValid}`,
      `Connection,Net Metering Status,${data.netMeteringStatus}`,
      `Grid Health,Sync Quality,${data.syncQuality}%`,
      `Grid Health,Voltage Stability,${data.voltageStability}%`,
      `Grid Health,Frequency Stability,${data.frequencyStability}%`,
      `Grid Health,Overall Score,${gridHealthScore}%`,
      `Financials,Export Earnings (6mo),₹${totalNetEarnings}`,
      `Financials,Total Exported (6mo),${totalExported} kWh`,
      `Financials,Total Imported (6mo),${totalImported} kWh`,
      "",
      "Month,Imported (kWh),Exported (kWh),Net Amount (₹)",
      ...data.monthlyNetMetering.map((m) => `${m.month},${m.imported},${m.exported},${m.netAmount}`),
      "",
      "Event ID,Timestamp,Type,Severity,Duration,Description",
      ...data.gridEvents.map(
        (e) => `${e.id},${e.timestamp},${e.type},${e.severity},${formatDuration(e.duration)},"${e.description}"`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grid-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, gridHealthScore, totalNetEarnings, totalExported, totalImported]);

  /* ── Loading skeleton ── */
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const healthGrade = getHealthGrade(gridHealthScore);

  /* ── Chart data ── */
  const netMeteringChart = data.monthlyNetMetering.map((m) => ({
    month: m.month,
    Imported: m.imported,
    Exported: m.exported,
  }));

  const earningsChart = data.monthlyNetMetering.map((m) => ({
    month: m.month,
    "Net Earnings (₹)": m.netAmount,
  }));

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="DISCOM / Grid Intelligence" /></h1>
          <p className="text-sm text-muted-foreground">
            <TranslatedText text="Net metering, grid synchronization & DISCOM interface — live from telemetry" />
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Net Metering Status Badge */}
          <Badge
            className={cn(
              "text-xs font-medium",
              data.netMeteringStatus === "approved"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : data.netMeteringStatus === "pending"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}
            variant="outline"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Net Metering: {data.netMeteringStatus.toUpperCase()}
          </Badge>

          {/* Auto-refresh countdown */}
          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
            <RefreshCcw className="h-3 w-3" />
            {countdown}s
          </Badge>

          {/* Manual refresh */}
          <button
            onClick={() => refetch()}
            title="Refresh grid data"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            title="Export grid report as CSV"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary KPI Row ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[
          {
            label: "Grid Health",
            value: `${gridHealthScore}%`,
            sub: healthGrade.label,
            icon: ShieldCheck,
            iconColor: healthGrade.color,
          },
          {
            label: "Sync Quality",
            value: `${data.syncQuality}%`,
            sub: data.syncQuality >= 95 ? "Excellent" : "Nominal",
            icon: Network,
            iconColor: "text-emerald-400",
          },
          {
            label: "Voltage",
            value: `${data.voltageStability}%`,
            sub: "Stability (7d)",
            icon: Activity,
            iconColor: "text-blue-400",
          },
          {
            label: "Frequency",
            value: `${data.frequencyStability}%`,
            sub: "Stability (7d)",
            icon: Radio,
            iconColor: "text-purple-400",
          },
          {
            label: "Net Earnings",
            value: `₹${totalNetEarnings.toLocaleString()}`,
            sub: "Last 6 months",
            icon: IndianRupee,
            iconColor: "text-amber-400",
          },
          {
            label: "Grid Events",
            value: String(eventStats.total),
            sub: `${eventStats.critical} critical`,
            icon: AlertTriangle,
            iconColor: eventStats.critical > 0 ? "text-red-400" : "text-emerald-400",
          },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={cn("h-4 w-4", kpi.iconColor)} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Connection Info Cards ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: "DISCOM Provider", value: data.discomName, icon: Network, sub: `Account: ${data.accountId}`, accent: "emerald" },
          { label: "Feed-in Tariff", value: `₹${data.feedInTariff.toFixed(2)}/kWh`, icon: IndianRupee, sub: `Valid until ${data.contractValid}`, accent: "amber" },
          { label: "Export Earnings", value: `₹${(data.exportEarnings * 1000).toLocaleString()}`, icon: ArrowUpRight, sub: `${totalExported.toLocaleString()} kWh exported (6mo)`, accent: "emerald" },
          { label: "Meter ID", value: data.meterId, icon: Gauge, sub: "Smart bi-directional meter", accent: "blue" },
        ].map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    item.accent === "emerald" ? "bg-emerald-500/10" :
                    item.accent === "amber" ? "bg-amber-500/10" : "bg-blue-500/10"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5",
                      item.accent === "emerald" ? "text-emerald-400" :
                      item.accent === "amber" ? "text-amber-400" : "text-blue-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <TranslatedText text={item.label} />
                    </p>
                    <p className="text-base font-bold tracking-tight truncate">{item.value}</p>
                    <p className="text-[11px] text-muted-foreground"><TranslatedText text={item.sub} /></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Grid Sync Quality Gauges ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <TranslatedText text="Grid Synchronization Quality" />
              </CardTitle>
              <Badge variant="outline" className={cn("text-xs font-medium", healthGrade.color)}>
                Overall: {gridHealthScore}% — {healthGrade.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { label: "Sync Quality", value: data.syncQuality, color: "emerald", threshold: 95, unit: "%" },
                { label: "Voltage Stability", value: data.voltageStability, color: "blue", threshold: 92, unit: "%" },
                { label: "Frequency Stability", value: data.frequencyStability, color: "purple", threshold: 90, unit: "%" },
              ].map((gauge) => {
                const isAbove = gauge.value >= gauge.threshold;
                return (
                  <div key={gauge.label} className="flex flex-col items-center gap-3">
                    {/* Circular gauge */}
                    <div className="relative h-28 w-28">
                      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(240 4% 14%)" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke={gauge.color === "emerald" ? "#34d399" : gauge.color === "blue" ? "#60a5fa" : "#a78bfa"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${gauge.value * 2.64} ${264 - gauge.value * 2.64}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold">{gauge.value}%</span>
                        {isAbove ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400 mt-0.5" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-yellow-400 mt-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        <TranslatedText text={gauge.label} />
                      </span>
                      <p className="text-[10px] text-muted-foreground/60">
                        Threshold: {gauge.threshold}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Net Metering Import/Export */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  <TranslatedText text="Monthly Import vs Export" />
                </CardTitle>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                    Imported: {totalImported.toLocaleString()} kWh
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    Exported: {totalExported.toLocaleString()} kWh
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                className="h-56"
                data={netMeteringChart}
                index="month"
                categories={["Imported", "Exported"]}
                colors={["rose", "emerald"]}
                valueFormatter={(v: number) => `${v.toLocaleString()} kWh`}
                showLegend
                showGridLines={false}
                showAnimation
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Earnings Chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <IndianRupee className="h-4 w-4 text-amber-400" />
                  <TranslatedText text="Net Metering Earnings" />
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Total: ₹{totalNetEarnings.toLocaleString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AreaChart
                className="h-56"
                data={earningsChart}
                index="month"
                categories={["Net Earnings (₹)"]}
                colors={["amber"]}
                valueFormatter={(v: number) => `₹${v.toLocaleString()}`}
                showLegend={false}
                showGridLines={false}
                showAnimation
                curveType="monotone"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Grid Events Timeline ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <TranslatedText text="Grid Events (Last 7 Days)" />
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {filteredEvents.length}
                </Badge>
              </CardTitle>
              {/* Event severity filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex gap-1">
                  {(["all", "critical", "warning", "info"] as const).map((sev) => (
                    <button
                      key={sev}
                      title={`Filter by ${sev}`}
                      onClick={() => setEventFilter(sev)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors capitalize",
                        eventFilter === sev
                          ? sev === "all"
                            ? "bg-foreground/10 text-foreground"
                            : sev === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : sev === "warning"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/20 text-blue-400"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {sev === "all" ? "All" : sev}
                      {sev !== "all" && (
                        <span className="ml-1 opacity-60">
                          ({eventStats[sev as keyof typeof eventStats]})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-400" />
                <p className="text-sm font-medium">No events matching filter</p>
                <p className="text-xs">All grid parameters are within normal range</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3",
                      severityColors[event.severity]
                    )}
                  >
                    <div className="mt-0.5 flex flex-col items-center gap-1">
                      {eventTypeIcons[event.type]}
                      <div className={cn("h-2 w-2 rounded-full", severityDot[event.severity])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {event.type.replace(/-/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {event.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {event.id}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        <TranslatedText text={event.description} />
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                        {event.duration > 0 && (
                          <span>Duration: {formatDuration(event.duration)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Contract Details Footer ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Contract: {data.discomName} — Valid until {data.contractValid}
                </span>
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Meter: {data.meterId}
                </span>
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Tariff: ₹{data.feedInTariff.toFixed(2)}/kWh
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50">
                Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
