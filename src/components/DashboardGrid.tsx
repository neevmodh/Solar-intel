/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — DashboardGrid
 * ─────────────────────────────────────────────────────────
 * The master orchestrator component. Fetches data via
 * React Query, handles loading/error states, and composes
 * all dashboard sub-components in a precise grid layout.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  Risk Overview Cards (4-col grid)         │
 *   ├────────────────────┬─────────────────────┤
 *   │  Trend Chart (3/5) │  AI Insights (2/5)  │
 *   ├────────────────────┴─────────────────────┤
 *   │  Inverter Fleet Table (full width)        │
 *   └──────────────────────────────────────────┘
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { fetchDashboardData } from "@/lib/api-client";

// Sub-components
import { RiskOverview } from "./dashboard/risk-overview";
import { InverterList } from "./dashboard/inverter-list";
import { TrendChart } from "./dashboard/trend-chart";
import { AIInsightsPanel } from "./dashboard/ai-insights-panel";
import { DashboardSkeleton } from "./dashboard/dashboard-skeleton";
import { DashboardError } from "./dashboard/dashboard-error";

export function DashboardGrid() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000, // Refresh every 5 min instead of 60s
  });

  // ── Loading State ──
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // ── Error State ──
  if (isError || !data) {
    return (
      <DashboardError
        error={error instanceof Error ? error : new Error("Unknown error")}
        onRetry={() => refetch()}
      />
    );
  }

  // ── Data Ready ──
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Row 1: Risk Overview Cards ── */}
      <motion.section variants={fadeUp}>
        <RiskOverview data={data.systemHealth} />
      </motion.section>

      {/* ── Row 2: Trend Chart + AI Insights ── */}
      <motion.section
        variants={fadeUp}
        className="grid grid-cols-1 gap-6 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <TrendChart data={data.performanceTrends} />
        </div>
        <div className="lg:col-span-2">
          <AIInsightsPanel insights={data.aiInsights} />
        </div>
      </motion.section>

      {/* ── Row 3: Inverter Fleet Table ── */}
      <motion.section variants={fadeUp}>
        <InverterList inverters={data.inverters} />
      </motion.section>
    </motion.div>
  );
}
