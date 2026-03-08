/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Sidebar Navigation (Full)
 * ─────────────────────────────────────────────────────────
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { slideInLeft } from "@/lib/motion";
import { useLang } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  LayoutDashboard,
  Zap,
  TrendingUp,
  Brain,
  Settings,
  Radio,
  Sun,
  Network,
  Wrench,
  Leaf,
  AlertTriangle,
  Factory,
  MessageSquare,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/** Navigation sections matching EcoPower reference */
const navSections = [
  {
    labelKey: "nav.overview" as TranslationKey,
    items: [
      { href: "/", labelKey: "nav.dashboard" as TranslationKey, icon: LayoutDashboard },
      { href: "/plants", labelKey: "nav.plants" as TranslationKey, icon: Factory, isNew: true },
      { href: "/inverters", labelKey: "nav.inverters" as TranslationKey, icon: Radio, dot: true },
    ],
  },
  {
    labelKey: "nav.fleet" as TranslationKey,
    items: [
      { href: "/analytics", labelKey: "nav.analytics" as TranslationKey, icon: TrendingUp },
      { href: "/security", labelKey: "nav.grid" as TranslationKey, icon: Network },
      { href: "/maintenance", labelKey: "nav.maintenance" as TranslationKey, icon: Wrench },
    ],
  },
  {
    labelKey: "nav.ai" as TranslationKey,
    items: [
      { href: "/ai-insights", labelKey: "nav.aiAdvisor" as TranslationKey, icon: Brain, isNew: true },
      { href: "/chat", labelKey: "nav.chat" as TranslationKey, icon: MessageSquare, isNew: true },
      { href: "/anomalies", labelKey: "nav.anomalies" as TranslationKey, icon: AlertTriangle, isNew: true },
      { href: "/forecast", labelKey: "nav.forecast" as TranslationKey, icon: Sun, isNew: true },
      { href: "/carbon", labelKey: "nav.carbon" as TranslationKey, icon: Leaf, isNew: true },
    ],
  },
  {
    labelKey: "nav.account" as TranslationKey,
    items: [
      { href: "/settings", labelKey: "nav.settings" as TranslationKey, icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <motion.aside
      initial="hidden"
      animate="visible"
      variants={slideInLeft}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col",
        "border-r border-border/50 bg-surface-1"
      )}
    >
      {/* ── Brand ── */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Solar Intel
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            AI Platform
          </span>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* ── Navigation Sections ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.labelKey}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {t(section.labelKey)}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-400"
                          transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        />
                      )}
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-400" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      {"dot" in item && item.dot && (
                        <div className="h-2 w-2 rounded-full bg-emerald-400 status-dot-healthy" />
                      )}
                      {"isNew" in item && item.isNew && (
                        <Badge className="h-4 bg-emerald-500/20 px-1.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20">
                          {t("common.new")}
                        </Badge>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-status-healthy status-dot-healthy" />
          <span className="text-xs text-muted-foreground">{t("header.allSystems")}</span>
        </div>
      </div>
    </motion.aside>
  );
}
