/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — GenAI Insights Panel
 * ─────────────────────────────────────────────────────────
 * Natural language failure risk summaries with glassmorphism
 * and animated AI-glow border. Each insight is an expandable
 * card with reasoning + recommended actions.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import type { AIInsight, RiskLevel } from "@/types";
import { TranslatedText } from "@/components/ui/translated-text";

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

/** Risk level styling */
const riskStyles: Record<RiskLevel, { badge: string; icon: string }> = {
  low: {
    badge: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    icon: "text-status-healthy",
  },
  medium: {
    badge: "bg-status-info/10 text-status-info border-status-info/20",
    icon: "text-status-info",
  },
  high: {
    badge: "bg-status-warning/10 text-status-warning border-status-warning/20",
    icon: "text-status-warning",
  },
  critical: {
    badge: "bg-status-critical/10 text-status-critical border-status-critical/20",
    icon: "text-status-critical",
  },
};

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    insights[0]?.id ?? null
  );

  return (
    <motion.div variants={fadeUp}>
      {/* ── Outer container with AI glow border ── */}
      <Card className="ai-glow overflow-hidden border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <TranslatedText text="GenAI Failure Intelligence" />
                  <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  <TranslatedText text="AI-generated risk analysis & recommendations" />
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 text-[10px] font-medium text-primary"
            >
              {insights.length} <TranslatedText text="insights" />
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-4 pt-0">
          <div className="scroll-thin max-h-[400px] overflow-y-auto overscroll-contain rounded-lg border border-border/30 bg-background/30 p-2">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {insights.map((insight) => {
              const isExpanded = expandedId === insight.id;
              const risk = riskStyles[insight.riskLevel];

              return (
                <motion.div key={insight.id} variants={fadeUp}>
                  <div
                    className={cn(
                      "glass cursor-pointer rounded-xl transition-all",
                      isExpanded && "ring-1 ring-primary/20"
                    )}
                  >
                    {/* ── Collapsed Header ── */}
                    <motion.button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : insight.id)
                      }
                      className="flex w-full items-start gap-3 p-4 text-left"
                      whileTap={{ scale: 0.995 }}
                    >
                      <AlertTriangle
                        className={cn("mt-0.5 h-4 w-4 shrink-0", risk.icon)}
                      />
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {insight.inverterName}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", risk.badge)}
                          >
                            {insight.riskLevel.toUpperCase()}
                          </Badge>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-foreground/90">
                          <TranslatedText text={insight.summary} />
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      >
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </motion.div>
                    </motion.button>

                    {/* ── Expanded Detail ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: {
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            },
                            opacity: { duration: 0.2 },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 border-t border-white/[0.04] px-4 pb-4 pt-3">
                            {/* Reasoning */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3 text-primary/60" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  <TranslatedText text="Analysis" />
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                <TranslatedText text={insight.reasoning} />
                              </p>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-status-healthy/60" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  <TranslatedText text="Recommended Actions" />
                                </span>
                              </div>
                              <ul className="space-y-1.5">
                                {insight.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                                    <TranslatedText text={rec} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
