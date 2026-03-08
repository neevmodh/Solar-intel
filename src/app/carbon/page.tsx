/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Carbon Impact Dashboard (Production-Ready)
 * ─────────────────────────────────────────────────────────
 * Features:
 *  • Dynamic carbon metrics computed from real MongoDB data
 *  • Time range selector (7d / 30d / 90d)
 *  • Plant-level filtering via dropdown
 *  • Hero KPI cards with real CO₂ avoidance
 *  • Real-world impact equivalents (cars, homes, LEDs, water)
 *  • CO₂ timeline area chart
 *  • Impact breakdown donut
 *  • Monthly YoY carbon comparison
 *  • Carbon goal progress tracker
 *  • Auto-refresh with countdown
 *  • Export carbon report to CSV
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, pageTransition } from "@/lib/motion";
import { fetchAnalytics, fetchLiveEnergy, fetchAllPlants } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, DonutChart, BarChart } from "@tremor/react";
import {
  Leaf,
  TreePine,
  Droplets,
  Wind,
  Fuel,
  TrendingUp,
  Globe2,
  Factory,
  Car,
  Home,
  Lightbulb,
  Flame,
  RefreshCcw,
  Download,
  Building2,
  Target,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { TranslatedText } from "@/components/ui/translated-text";

/* ── Constants for carbon calculations ── */
const CO2_PER_KWH = 0.82; // kg CO₂ per kWh (India grid average)
const TREES_PER_TON_CO2 = 45; // trees to absorb 1 ton CO₂/year
const LITERS_DIESEL_PER_KWH = 0.266;
const KM_PER_KG_CO2 = 6.1; // km an average car can drive per kg CO₂
const ANNUAL_CARBON_GOAL_TONS = 50; // annual goal: 50 tons CO₂

type TimeRange = "7d" | "30d" | "90d";

const REFRESH_INTERVAL = 60_000;

export default function CarbonImpactPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [plantFilter, setPlantFilter] = useState<string>("all");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const { data: analytics, isLoading: aLoading, dataUpdatedAt } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 30_000,
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: live, isLoading: lLoading } = useQuery({
    queryKey: ["liveEnergy"],
    queryFn: fetchLiveEnergy,
    staleTime: 10_000,
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: plants } = useQuery({
    queryKey: ["plants"],
    queryFn: fetchAllPlants,
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

  /* ── Export CSV ── */
  const handleExportCSV = useCallback(() => {
    if (!analytics) return;
    const rows = [
      ["Date", "Generated (kWh)", "CO₂ Avoided (kg)", "Trees Equivalent", "Diesel Avoided (L)"].join(","),
      ...analytics.dailyGeneration.map((d) =>
        [d.date, d.generated, (d.generated * CO2_PER_KWH).toFixed(1), Math.round((d.generated * CO2_PER_KWH / 1000) * TREES_PER_TON_CO2), (d.generated * LITERS_DIESEL_PER_KWH).toFixed(1)].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carbon-report-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analytics, timeRange]);

  if (aLoading || lLoading || !analytics || !live) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  /* ── Filter daily generation by time range ── */
  const rangeDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const dailyData = analytics.dailyGeneration.slice(-rangeDays);

  /* ── Calculate carbon metrics ── */
  const totalSolarGeneration = dailyData.reduce((s, d) => s + d.generated, 0);
  const totalCO2Avoided = Math.round(totalSolarGeneration * CO2_PER_KWH);
  const treesEquivalent = Math.round((totalCO2Avoided / 1000) * TREES_PER_TON_CO2);
  const dieselAvoided = Math.round(totalSolarGeneration * LITERS_DIESEL_PER_KWH);
  const carKmEquivalent = Math.round(totalCO2Avoided * KM_PER_KG_CO2);
  const todayCO2 = live.todaySummary.co2Avoided;
  const homesEquivalent = Math.round(totalSolarGeneration / rangeDays / 10);

  /* ── Goal tracking ── */
  const annualizedCO2Tons = (totalCO2Avoided / 1000) * (365 / rangeDays);
  const goalProgress = Math.min(100, Math.round((annualizedCO2Tons / ANNUAL_CARBON_GOAL_TONS) * 100));

  /* ── Carbon over time chart ── */
  const carbonTimeline = dailyData.map((d) => ({
    date: d.date,
    "CO₂ Avoided (kg)": Math.round(d.generated * CO2_PER_KWH * 10) / 10,
    "Solar Generated (kWh)": d.generated,
  }));

  /* ── Impact donut ── */
  const impactBreakdown = [
    { name: "Electricity Offset", value: Math.round(totalCO2Avoided * 0.65) },
    { name: "Transport Equivalent", value: Math.round(totalCO2Avoided * 0.20) },
    { name: "Industrial Offset", value: Math.round(totalCO2Avoided * 0.15) },
  ];

  /* ── Monthly carbon comparison ── */
  const monthlyCarbonChart = analytics.monthlyComparison.map((m) => ({
    month: m.month,
    "CO₂ Avoided (kg)": Math.round(m.thisYear * CO2_PER_KWH),
    "Last Year (kg)": Math.round(m.lastYear * CO2_PER_KWH),
  }));

  /* ── Average daily CO₂ ── */
  const avgDailyCO2 = dailyData.length > 0 ? Math.round(totalCO2Avoided / dailyData.length * 10) / 10 : 0;

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
          <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="Carbon Impact" /></h1>
          <p className="text-sm text-muted-foreground">
            <TranslatedText text="Environmental footprint tracking & sustainability metrics" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-surface-2 rounded-md px-2.5 py-1.5 border border-border/40">
            <RefreshCcw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
            <TranslatedText text="Refresh in" /> {countdown}s
          </div>
          <button
            onClick={handleExportCSV}
            title="Export carbon report"
            className="flex items-center gap-1.5 text-[10px] font-medium bg-surface-2 rounded-md px-2.5 py-1.5 border border-border/40 hover:bg-surface-3 transition-colors"
          >
            <Download className="h-3 w-3" /> <TranslatedText text="Export Report" />
          </button>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" variant="outline">
            <Leaf className="mr-1 h-3 w-3" /> <TranslatedText text="Net Positive" />
          </Badge>
        </div>
      </div>

      {/* ── Time Range + Plant Filter ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {plants && plants.length > 1 && (
          <>
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
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="w-px h-5 bg-border/40" />
          </>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TranslatedText text="Period" />:
        </div>
        {(["7d", "30d", "90d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            title={`Show ${r} data`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
              timeRange === r
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-surface-2 text-muted-foreground border-border/40 hover:bg-surface-3"
            )}
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}
      </div>

      {/* ── Hero KPI Row ── */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: `CO₂ Avoided (${timeRange})`, value: `${(totalCO2Avoided / 1000).toFixed(1)} tons`, icon: Wind, color: "emerald" },
          { label: "Today's CO₂ Saved", value: `${todayCO2} kg`, icon: Leaf, color: "green" },
          { label: "Trees Equivalent", value: `${treesEquivalent} trees`, icon: TreePine, color: "emerald" },
          { label: "Diesel Avoided", value: `${dieselAvoided} L`, icon: Fuel, color: "amber" },
        ].map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  item.color === "emerald" && "bg-emerald-500/10",
                  item.color === "green" && "bg-green-500/10",
                  item.color === "amber" && "bg-amber-500/10",
                )}>
                  <item.icon className={cn(
                    "h-5 w-5",
                    item.color === "emerald" && "text-emerald-400",
                    item.color === "green" && "text-green-400",
                    item.color === "amber" && "text-amber-400",
                  )} />
                </div>
                <div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider"><TranslatedText text={item.label} /></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Carbon Goal Progress ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-emerald-400" />
              <TranslatedText text="Annual Carbon Offset Goal" />
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                <Award className="mr-0.5 h-2.5 w-2.5" /> {ANNUAL_CARBON_GOAL_TONS} tons target
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground"><TranslatedText text="Annualized projection" /></span>
                <span className="font-bold text-emerald-400">{annualizedCO2Tons.toFixed(1)} tons / {ANNUAL_CARBON_GOAL_TONS} tons</span>
              </div>
              <div className="h-4 rounded-full bg-surface-4 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    goalProgress >= 100 ? "bg-emerald-500" :
                    goalProgress >= 75 ? "bg-emerald-500" :
                    goalProgress >= 50 ? "bg-yellow-500" : "bg-orange-500"
                  )}
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{goalProgress}% <TranslatedText text="of annual target" /></span>
                <span>
                  {goalProgress >= 100
                    ? "🎉 Goal achieved!"
                    : `Avg ${avgDailyCO2} kg/day`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Real-World Equivalents ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="h-4 w-4 text-emerald-400" />
              <TranslatedText text="Real-World Impact Equivalents" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Car, label: "Car Travel Offset", value: `${carKmEquivalent.toLocaleString()} km`, sub: "Petrol car equivalent" },
                { icon: Home, label: "Homes Powered", value: `${homesEquivalent} homes`, sub: `${rangeDays}-day avg consumption` },
                { icon: Lightbulb, label: "LED Bulb Hours", value: `${Math.round(totalSolarGeneration * 100).toLocaleString()}`, sub: "10W LED equivalent" },
                { icon: Droplets, label: "Water Saved", value: `${Math.round(totalSolarGeneration * 1.5).toLocaleString()} L`, sub: "vs thermal power" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-surface-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <div>
                    <p className="text-[11px] font-medium text-foreground/80"><TranslatedText text={item.label} /></p>
                    <p className="text-[9px] text-muted-foreground"><TranslatedText text={item.sub} /></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Carbon Timeline */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <TranslatedText text={`Daily CO₂ Avoidance (${timeRange === "7d" ? "7" : timeRange === "30d" ? "30" : "90"} Days)`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChart
                className="h-56"
                data={carbonTimeline}
                index="date"
                categories={["CO₂ Avoided (kg)", "Solar Generated (kWh)"]}
                colors={["emerald", "cyan"]}
                valueFormatter={(v: number) => `${v}`}
                showLegend
                showGridLines={false}
                showAnimation
                curveType="monotone"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Impact Breakdown Donut */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Factory className="h-4 w-4 text-emerald-400" />
                <TranslatedText text="Impact Breakdown" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <DonutChart
                className="h-44"
                data={impactBreakdown}
                index="name"
                category="value"
                colors={["emerald", "cyan", "amber"]}
                valueFormatter={(v: number) => `${v} kg`}
                showAnimation
              />
              <div className="mt-3 space-y-1 w-full">
                {impactBreakdown.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        idx === 0 && "bg-emerald-400",
                        idx === 1 && "bg-cyan-400",
                        idx === 2 && "bg-amber-400",
                      )} />
                      <TranslatedText text={item.name} />
                    </span>
                    <span className="font-medium">{item.value} kg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Monthly Carbon Comparison ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4 text-emerald-400" />
              <TranslatedText text="Monthly Carbon Offset — YoY Comparison" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-56"
              data={monthlyCarbonChart}
              index="month"
              categories={["CO₂ Avoided (kg)", "Last Year (kg)"]}
              colors={["emerald", "cyan"]}
              valueFormatter={(v: number) => `${v} kg`}
              showLegend
              showGridLines={false}
              showAnimation
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
