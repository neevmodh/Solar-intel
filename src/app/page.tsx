/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Dashboard View (app/page.tsx)
 * ─────────────────────────────────────────────────────────
 * The primary operational dashboard. Wraps DashboardGrid
 * with AnimatePresence for seamless page transitions.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "@/lib/motion";
import { DashboardGrid } from "@/components/DashboardGrid";
import { TranslatedText } from "@/components/ui/translated-text";

export default function DashboardPage() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="mx-auto max-w-[1440px]"
      >
        <div className="mb-6">
          <motion.h2
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-xl font-bold tracking-tight text-foreground"
          >
            <TranslatedText text="System Overview" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            <TranslatedText text="Monitor inverter health, performance trends, and AI-predicted failure risks across your solar fleet." />
          </motion.p>
        </div>
        <DashboardGrid />
      </motion.div>
    </AnimatePresence>
  );
}
