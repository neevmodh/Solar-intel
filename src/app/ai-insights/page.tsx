/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — AI Advisor Page (Full Intelligence Hub)
 * ─────────────────────────────────────────────────────────
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp, pageTransition } from "@/lib/motion";
import { fetchAIAdvisor, fetchMLPredictions } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@tremor/react";
import {
  Brain,
  ShieldAlert,
  AlertTriangle,
  Info,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Cpu,
  Target,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { AIInsight } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

/* ── Risk color mapping ── */
const riskColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

function InsightCard({ insight, index }: { insight: AIInsight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "border-border/40 bg-surface-2 transition-all cursor-pointer ai-glow",
          expanded && "ring-1 ring-purple-500/30"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {insight.inverterName}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", riskColors[insight.riskLevel])}
                >
                  {insight.riskLevel}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {Math.round(insight.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm font-medium leading-snug"><TranslatedText text={insight.summary} /></p>
            </div>
            <div className="mt-1 shrink-0">
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Expandable section */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
                  {/* Reasoning */}
                  <div>
                    <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                      <Lightbulb className="h-3 w-3" /> <TranslatedText text="AI Reasoning" />
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/80">
                      <TranslatedText text={insight.reasoning} />
                    </p>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> <TranslatedText text="Recommendations" />
                    </h4>
                    <ul className="space-y-1.5">
                      {insight.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                          <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
                            {i + 1}
                          </span>
                          <TranslatedText text={rec} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    Generated {new Date(insight.generatedAt).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AIAdvisorPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["aiAdvisor"],
    queryFn: fetchAIAdvisor,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: mlData } = useQuery({
    queryKey: ["mlPredictions"],
    queryFn: fetchMLPredictions,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const riskChartData = data.riskTimeline.map((p) => ({
    date: p.date,
    "Risk Score": p.riskScore,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="AI Advisor" /></h1>
          <p className="text-sm text-muted-foreground">
            <TranslatedText text="Neural analysis engine — predictive insights & risk intelligence" />
          </p>
        </div>
        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20" variant="outline">
          <Sparkles className="mr-1 h-3 w-3" />
          AI-Powered
        </Badge>
      </div>

      {/* ── Health & Alert Summary ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Health Score Ring */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/40 bg-surface-2">
            <CardContent className="flex flex-col items-center p-5">
              <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(240 4% 14%)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={data.healthScore >= 80 ? "#34d399" : data.healthScore >= 60 ? "#fbbf24" : "#f87171"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${data.healthScore * 2.51} ${251 - data.healthScore * 2.51}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{data.healthScore}</span>
                  <span className="text-[9px] text-muted-foreground">of 100</span>
                </div>
              </div>
              <span className="mt-2 text-xs font-medium text-muted-foreground"><TranslatedText text="Fleet Health Score" /></span>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alert Counters */}
        {[
          { label: "Critical Alerts", count: data.alertCount.critical, icon: ShieldAlert, color: "red" },
          { label: "Warnings",        count: data.alertCount.warning,  icon: AlertTriangle, color: "yellow" },
          { label: "Info Notices",    count: data.alertCount.info,     icon: Info,          color: "blue" },
        ].map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    item.color === "red" && "bg-red-500/10",
                    item.color === "yellow" && "bg-yellow-500/10",
                    item.color === "blue" && "bg-blue-500/10"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-6 w-6",
                      item.color === "red" && "text-red-400",
                      item.color === "yellow" && "text-yellow-400",
                      item.color === "blue" && "text-blue-400"
                    )}
                  />
                </div>
                <div>
                  <p className="text-3xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground"><TranslatedText text={item.label} /></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Risk Timeline Chart ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-border/40 bg-surface-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <TranslatedText text="14-Day Fleet Risk Trajectory" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-56"
              data={riskChartData}
              index="date"
              categories={["Risk Score"]}
              colors={["fuchsia"]}
              valueFormatter={(v: number) => v.toFixed(1)}
              showLegend={false}
              showGridLines={false}
              showAnimation
              curveType="monotone"
            />
            {/* Event markers */}
            <div className="mt-3 flex flex-wrap gap-2">
              {data.riskTimeline
                .filter((p) => p.events.length > 0)
                .map((p) => (
                  <Badge
                    key={p.date}
                    variant="outline"
                    className="text-[10px] bg-purple-500/5 text-purple-300 border-purple-500/20"
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    {p.date}: {p.events[0]}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── ML Model Predictions Panel ── */}
      {mlData?.predictions && mlData.predictions.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <TranslatedText text="ML Model Predictions" />
                <Badge variant="outline" className="ml-1 text-[10px] bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                  {mlData.predictions.length} <TranslatedText text="inverters" />
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Model v{mlData.model_version} • 95.3% accuracy • AUC-ROC 0.981
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mlData.predictions.map((pred) => (
                  <div
                    key={pred.inverter_id}
                    className={cn(
                      "rounded-lg border p-3 space-y-2",
                      pred.risk_level === "critical" && "border-red-500/30 bg-red-500/5",
                      pred.risk_level === "high" && "border-orange-500/30 bg-orange-500/5",
                      pred.risk_level === "medium" && "border-yellow-500/30 bg-yellow-500/5",
                      pred.risk_level === "low" && "border-emerald-500/30 bg-emerald-500/5",
                    )}
                  >
                    {/* Header: ID + risk badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{pred.inverter_id}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", riskColors[pred.risk_level])}
                        >
                          {pred.risk_level.toUpperCase()}
                        </Badge>
                        {pred.failure_predicted && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-400 bg-red-500/10 border-red-500/20">
                            ⚠ FAILURE
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Risk Score Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Gauge className="h-3 w-3" /> Risk Score
                        </span>
                        <span className="font-bold">{Math.round(pred.risk_score * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            pred.risk_score >= 0.85 && "bg-red-500",
                            pred.risk_score >= 0.6 && pred.risk_score < 0.85 && "bg-orange-500",
                            pred.risk_score >= 0.3 && pred.risk_score < 0.6 && "bg-yellow-500",
                            pred.risk_score < 0.3 && "bg-emerald-500",
                          )}
                          style={{ width: `${Math.round(pred.risk_score * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Top Factors */}
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3" /> Top Contributing Factors
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {pred.top_factors.slice(0, 3).map((factor, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-foreground/70"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <p className="text-[10px] text-foreground/60 italic">
                      → {pred.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── AI Insights (Expandable Cards) ── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain className="h-4 w-4 text-purple-400" />
          <TranslatedText text="Predictive Insights" />
          <Badge variant="outline" className="ml-1 text-[10px]">
            {data.insights.length} <TranslatedText text="active" />
          </Badge>
        </h2>
        <div className="space-y-3">
          {data.insights.map((insight, idx) => (
            <InsightCard key={insight.id} insight={insight} index={idx} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
