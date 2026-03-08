/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Risk Overview Cards
 * ─────────────────────────────────────────────────────────
 * Aggregated system health metrics displayed as a premium
 * card grid with staggered Framer Motion entrance.
 */

"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, hoverLift } from "@/lib/motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  Zap,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Clock,
  Server,
  Brain,
} from "lucide-react";
import type { SystemHealth } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

interface RiskOverviewProps {
  data: SystemHealth;
}

/** Single metric card definition */
interface MetricCard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
  color: "default" | "healthy" | "warning" | "critical" | "info";
}

/** Map status color to Tailwind classes */
const colorMap = {
  default: {
    icon: "text-foreground",
    bg: "bg-muted/50",
    accent: "border-border/50",
  },
  healthy: {
    icon: "text-status-healthy",
    bg: "bg-status-healthy/5",
    accent: "border-status-healthy/20",
  },
  warning: {
    icon: "text-status-warning",
    bg: "bg-status-warning/5",
    accent: "border-status-warning/20",
  },
  critical: {
    icon: "text-status-critical",
    bg: "bg-status-critical/5",
    accent: "border-status-critical/20",
  },
  info: {
    icon: "text-status-info",
    bg: "bg-status-info/5",
    accent: "border-status-info/20",
  },
};

export function RiskOverview({ data }: RiskOverviewProps) {
  // Smart power display: kW for small values, MW for large
  const powerMw = data.totalPowerOutput;
  const powerDisplay = powerMw >= 1 
    ? `${powerMw.toFixed(1)} MW` 
    : `${(powerMw * 1000).toFixed(1)} kW`;

  const metrics: MetricCard[] = [
    { label: "Total Inverters",   value: data.totalInverters,       subtitle: "Across all sites",          icon: Server,      color: "default"  },
    { label: "Healthy",           value: data.healthyCount,         subtitle: `${Math.round((data.healthyCount / data.totalInverters) * 100)}% of fleet`, icon: Activity, trend: "+2", color: "healthy" },
    { label: "Warnings",          value: data.warningCount,         subtitle: "Require attention",         icon: AlertTriangle, color: "warning" },
    { label: "Critical Risk",     value: data.criticalCount,        subtitle: "Immediate action needed",   icon: ShieldAlert, color: "critical" },
    { label: "Avg Performance",   value: `${data.avgPerformanceRatio}%`, subtitle: "Fleet-wide ratio",     icon: TrendingUp,  trend: "+1.2%", color: "info" },
    { label: "Total Output",      value: powerDisplay,              subtitle: "Combined generation",       icon: Zap,         color: "default"  },
    { label: "System Uptime",     value: `${data.systemUptime}%`,   subtitle: "Last 30 days",              icon: Clock,       color: "healthy"  },
    { label: "AI Predictions",    value: data.predictedFailures,    subtitle: "Failures predicted (7d)",   icon: Brain,       color: "critical" },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {metrics.map((metric) => {
        const colors = colorMap[metric.color];
        const Icon = metric.icon;

        return (
          <motion.div key={metric.label} variants={fadeUp}>
            <motion.div variants={hoverLift} initial="rest" whileHover="hover">
              <Card className={cn("relative overflow-hidden border transition-shadow bg-card hover:shadow-card-hover", colors.accent)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <TranslatedText text={metric.label} />
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                          {metric.value}
                        </p>
                        {metric.trend && (
                          <span className="text-xs font-medium text-status-healthy">
                            {metric.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <TranslatedText text={metric.subtitle} />
                      </p>
                    </div>
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
                      <Icon className={cn("h-5 w-5", colors.icon)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
