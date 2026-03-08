/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Inverter List Table
 * ─────────────────────────────────────────────────────────
 * Highly polished data table with status indicator dots
 * (glowing green/yellow/red), sortable columns, and
 * smooth row entrance animations.
 */

"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Thermometer,
  Zap,
  Clock,
} from "lucide-react";
import type { Inverter, InverterStatus } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

interface InverterListProps {
  inverters: Inverter[];
}

/** Status dot + badge styling */
const statusConfig: Record<
  InverterStatus,
  { dot: string; badge: string; label: string }
> = {
  healthy: {
    dot: "bg-status-healthy status-dot-healthy",
    badge: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    label: "Healthy",
  },
  warning: {
    dot: "bg-status-warning status-dot-warning",
    badge: "bg-status-warning/10 text-status-warning border-status-warning/20",
    label: "Warning",
  },
  critical: {
    dot: "bg-status-critical status-dot-critical",
    badge: "bg-status-critical/10 text-status-critical border-status-critical/20",
    label: "Critical",
  },
};

/** Format relative time from ISO string */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function InverterList({ inverters }: InverterListProps) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight">
              <TranslatedText text="Inverter Fleet Status" />
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">
              {inverters.length} <TranslatedText text="units" />
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="scroll-thin max-h-[420px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border/50 hover:bg-transparent">
                  {(["Inverter","Status","Performance","Temp","Output","Risk","Updated"] as const).map((col) => (
                    <TableHead key={col} className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", col === "Inverter" && "pl-6", col === "Updated" && "pr-6 text-right")}>
                      <TranslatedText text={col} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <motion.tbody
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="contents"
                >
                  {inverters.map((inverter) => {
                    const status = statusConfig[inverter.status];

                    return (
                      <motion.tr
                        key={inverter.id}
                        variants={fadeUp}
                        className={cn(
                          "group cursor-pointer border-border/30 transition-colors hover:bg-muted/30",
                          inverter.status === "critical" && "bg-status-critical/[0.02]"
                        )}
                      >
                        {/* Inverter name + location */}
                        <TableCell className="pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              <TranslatedText text={inverter.name} />
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <TranslatedText text={inverter.location} />
                            </span>
                          </div>
                        </TableCell>

                        {/* Status with glowing dot */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} />
                            <Badge variant="outline" className={cn("text-[10px] font-medium", status.badge)}>
                              <TranslatedText text={status.label} />
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Performance ratio bar */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  inverter.performanceRatio >= 85
                                    ? "bg-status-healthy"
                                    : inverter.performanceRatio >= 70
                                    ? "bg-status-warning"
                                    : "bg-status-critical"
                                )}
                                style={{ width: `${inverter.performanceRatio}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {inverter.performanceRatio}%
                            </span>
                          </div>
                        </TableCell>

                        {/* Temperature */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Thermometer
                              className={cn(
                                "h-3 w-3",
                                inverter.temperature > 65
                                  ? "text-status-critical"
                                  : inverter.temperature > 50
                                  ? "text-status-warning"
                                  : "text-muted-foreground"
                              )}
                            />
                            <span className="text-xs font-mono text-muted-foreground">
                              {inverter.temperature}°C
                            </span>
                          </div>
                        </TableCell>

                        {/* Power output */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">
                              {inverter.powerOutput} kW
                            </span>
                          </div>
                        </TableCell>

                        {/* Risk score */}
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs font-semibold font-mono",
                              inverter.riskScore >= 70
                                ? "text-status-critical"
                                : inverter.riskScore >= 40
                                ? "text-status-warning"
                                : "text-status-healthy"
                            )}
                          >
                            {inverter.riskScore}
                          </span>
                        </TableCell>

                        {/* Last updated */}
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">
                              {timeAgo(inverter.lastUpdated)}
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
