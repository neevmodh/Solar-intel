/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Performance Trend Chart
 * ─────────────────────────────────────────────────────────
 * Tremor AreaChart showing performance ratio over 30 days,
 * with expected vs. actual comparison.
 */

"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart } from "@tremor/react";
import type { PerformanceTrend } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

interface TrendChartProps {
  data: PerformanceTrend[];
}

export function TrendChart({ data }: TrendChartProps) {
  // Transform data for Tremor (rename keys for display)
  const chartData = data.map((d) => ({
    date: d.date,
    "Actual PR (%)": d.performanceRatio,
    "Expected PR (%)": d.expectedRatio,
    "Power Output (MW)": d.powerOutput,
  }));

  return (
    <motion.div variants={fadeUp}>
      <Card className="border border-border/50 bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                <TranslatedText text="Performance Ratio Trend" />
              </CardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <TranslatedText text="Fleet-wide 30-day performance tracking" />
              </p>
            </div>
            <Badge
              variant="secondary"
              className="font-mono text-[10px] text-muted-foreground"
            >
              30D
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <AreaChart
            className="h-64"
            data={chartData}
            index="date"
            categories={["Actual PR (%)", "Expected PR (%)"]}
            colors={["violet", "cyan"]}
            showLegend={true}
            showGridLines={false}
            showAnimation={true}
            curveType="monotone"
            connectNulls={true}
            yAxisWidth={45}
            valueFormatter={(value: number) => `${value.toFixed(1)}%`}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
