/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Analytics Page (/analytics)
 * ────────                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-400" />
                    <CardTitle className="text-sm font-semibold"><TranslatedText text="Inverter Performance Ranking" /></CardTitle>
                  </div>─────────────────────────────────────────────
 * Deep analytics: generation vs consumption, monthly YoY,
 * inverter ranking, degradation tracking, energy mix.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition, staggerContainer, fadeUp } from "@/lib/motion";
import { fetchAnalytics } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, BarChart, DonutChart } from "@tremor/react";
import { cn } from "@/lib/utils";
import { TrendingDown, Award, PieChart } from "lucide-react";
import { TranslatedText } from "@/components/ui/translated-text";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card"><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const genChart = data.dailyGeneration.map((d) => ({
    date: d.date, "Generated (kWh)": d.generated, "Consumed (kWh)": d.consumed, "Exported (kWh)": d.exported,
  }));

  const monthlyChart = data.monthlyComparison.map((m) => ({
    month: m.month, "This Year": m.thisYear, "Last Year": m.lastYear, Target: m.target,
  }));

  const degradChart = data.degradationAnalysis.map((d) => ({
    month: d.month, "Actual PR (%)": d.actual, "Expected PR (%)": d.expected,
  }));

  // Totals for donut
  const totalSolar = data.energyMix.reduce((s, e) => s + e.solar, 0);
  const totalGrid = data.energyMix.reduce((s, e) => s + e.grid, 0);
  const totalBattery = data.energyMix.reduce((s, e) => s + e.battery, 0);
  const donutData = [
    { name: "Solar", value: Math.round(totalSolar / data.energyMix.length) },
    { name: "Grid", value: Math.round(totalGrid / data.energyMix.length) },
    { name: "Battery", value: Math.round(totalBattery / data.energyMix.length) },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div key="analytics" variants={pageTransition} initial="initial" animate="animate" exit="exit" className="mx-auto max-w-[1440px]">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight"><TranslatedText text="Analytics" /></h2>
          <p className="text-sm text-muted-foreground"><TranslatedText text="Deep performance analysis across your solar fleet" /></p>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
          {/* ── Generation vs Consumption ── */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold"><TranslatedText text="Generation vs Consumption (30 Days)" /></CardTitle>
                  <Badge variant="secondary" className="font-mono text-[10px]">30D</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <AreaChart className="h-72" data={genChart} index="date" categories={["Generated (kWh)", "Consumed (kWh)", "Exported (kWh)"]} colors={["emerald", "blue", "violet"]} showLegend showGridLines={false} showAnimation curveType="monotone" yAxisWidth={50} valueFormatter={(v: number) => `${v.toFixed(1)} kWh`} />
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Monthly YoY + Energy Mix Donut ── */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold"><TranslatedText text="Monthly Comparison (Year-over-Year)" /></CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart className="h-64" data={monthlyChart} index="month" categories={["This Year", "Last Year", "Target"]} colors={["emerald", "cyan", "violet"]} showLegend showGridLines={false} showAnimation yAxisWidth={50} valueFormatter={(v: number) => `${v} kWh`} />
                </CardContent>
              </Card>
            </div>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold"><TranslatedText text="Energy Mix (14D Avg)" /></CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <DonutChart data={donutData} category="value" index="name" colors={["emerald", "cyan", "amber"]} className="h-48" showAnimation valueFormatter={(v: number) => `${v}%`} />
                <div className="mt-4 flex gap-4">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-emerald-500" : i === 1 ? "bg-cyan-500" : "bg-amber-500")} />
                      {d.name}: {d.value}%
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Inverter Ranking ── */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-400" />
                  <CardTitle className="text-sm font-semibold">Inverter Performance Ranking</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.inverterRanking.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 rounded-lg border border-border/30 bg-surface-2 px-4 py-3">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", inv.rank <= 3 ? "bg-yellow-500/10 text-yellow-400" : "bg-muted text-muted-foreground")}>
                        #{inv.rank}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{inv.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{inv.id}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                        <p className="text-xs text-muted-foreground"><TranslatedText text="Performance" /></p>
                          <p className={cn("text-sm font-bold font-mono", inv.performance >= 90 ? "text-emerald-400" : inv.performance >= 75 ? "text-yellow-400" : "text-red-400")}>
                            {inv.performance}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground"><TranslatedText text="Daily Yield" /></p>
                          <p className="text-sm font-bold font-mono text-muted-foreground">{inv.yield} kWh</p>
                        </div>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", inv.performance >= 90 ? "bg-emerald-500" : inv.performance >= 75 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${inv.performance}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Degradation Analysis ── */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <CardTitle className="text-sm font-semibold"><TranslatedText text="Fleet Degradation Analysis (12 Months)" /></CardTitle>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">12M</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <AreaChart className="h-64" data={degradChart} index="month" categories={["Actual PR (%)", "Expected PR (%)"]} colors={["rose", "cyan"]} showLegend showGridLines={false} showAnimation curveType="monotone" yAxisWidth={45} valueFormatter={(v: number) => `${v.toFixed(2)}%`} />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
