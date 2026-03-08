/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Dashboard Error State
 * ─────────────────────────────────────────────────────────
 * Graceful error display with retry capability.
 */

"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface DashboardErrorProps {
  error: Error;
  onRetry: () => void;
}

export function DashboardError({ error, onRetry }: DashboardErrorProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Card className="max-w-md border border-destructive/20 bg-card">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              Failed to load dashboard data
            </h3>
            <p className="text-xs text-muted-foreground">
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
