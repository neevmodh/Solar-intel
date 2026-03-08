/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Notification Panel
 * ─────────────────────────────────────────────────────────
 * Popover that opens when the Bell icon is clicked.
 * Pulls live data from /api/dashboard — shows:
 *   • Critical / warning inverters
 *   • AI insight alerts (high / critical risk)
 *   • System health summary
 * No extra API route needed — reuses existing /api/dashboard.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bell,
  X,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Zap,
  Brain,
  RefreshCw,
  Clock,
} from "lucide-react";
import type { DashboardData } from "@/types";

// ── fetch ─────────────────────────────────────────────────

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load notifications");
  const json = await res.json();
  return json.data;
}

// ── types ─────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  body: string;
  severity: "critical" | "warning" | "info";
  time: string;
  read: boolean;
}

// ── helpers ───────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildNotifications(data: DashboardData): Notification[] {
  const items: Notification[] = [];

  // ── Critical / warning inverters
  data.inverters
    .filter((inv) => inv.status === "critical" || inv.status === "warning")
    .slice(0, 5)
    .forEach((inv) => {
      items.push({
        id:       `inv-${inv.id}`,
        title:    inv.status === "critical" ? "Critical inverter fault" : "Inverter warning",
        body:     `${inv.name} at ${inv.location} — risk score ${inv.riskScore}, output ${inv.powerOutput.toFixed(1)} kW`,
        severity: inv.status === "critical" ? "critical" : "warning",
        time:     inv.lastUpdated ?? new Date().toISOString(),
        read:     false,
      });
    });

  // ── AI insights (high / critical risk)
  data.aiInsights
    .filter((ins) => ins.riskLevel === "critical" || ins.riskLevel === "high")
    .slice(0, 4)
    .forEach((ins) => {
      items.push({
        id:       `ai-${ins.id}`,
        title:    ins.riskLevel === "critical" ? "AI: Critical risk detected" : "AI: High risk flagged",
        body:     `${ins.inverterName} — ${ins.summary}`,
        severity: ins.riskLevel === "critical" ? "critical" : "warning",
        time:     ins.generatedAt,
        read:     false,
      });
    });

  // ── System health summary (always show as info)
  const { criticalCount, warningCount, totalInverters } = data.systemHealth;
  items.push({
    id:       "health-summary",
    title:    "System health summary",
    body:     `${totalInverters} inverters — ${criticalCount} critical, ${warningCount} warning, ${totalInverters - criticalCount - warningCount} healthy`,
    severity: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
    time:     new Date().toISOString(),
    read:     true,
  });

  // Sort: unread first, then by severity
  const order = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return order[a.severity] - order[b.severity];
  });
}

// ── severity styles ───────────────────────────────────────

const severityConfig = {
  critical: {
    icon:  XCircle,
    dot:   "bg-red-500",
    ring:  "border-red-500/25 bg-red-500/8",
    text:  "text-red-400",
    badge: "bg-red-500/20 text-red-400",
  },
  warning: {
    icon:  AlertTriangle,
    dot:   "bg-amber-500",
    ring:  "border-amber-500/25 bg-amber-500/8",
    text:  "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
  },
  info: {
    icon:  CheckCircle2,
    dot:   "bg-emerald-500",
    ring:  "border-emerald-500/25 bg-emerald-500/8",
    text:  "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400",
  },
} as const;

// ── component ─────────────────────────────────────────────

export function NotificationPanel() {
  const [open, setOpen]       = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef              = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["notifications-dashboard"],
    queryFn:  fetchDashboard,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const notifications = data ? buildNotifications(data) : [];
  const unread = notifications.filter((n) => !n.read && !readIds.has(n.id));
  const unreadCount = unread.length;

  function markAllRead() {
    const s = new Set<string>();
    notifications.forEach((n) => s.add(n.id));
    setReadIds(s);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          open
            ? "bg-white/10 text-foreground"
            : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit={{    opacity: 0, y: -8, scale: 0.97  }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={cn(
              "absolute right-0 top-12 z-50 w-[380px] overflow-hidden rounded-2xl",
              "border border-white/10 bg-[#0f1117]/95 shadow-2xl backdrop-blur-xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetch()}
                  title="Refresh"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="text-[11px] text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  title="Close notifications"
                  className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[420px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-white/8" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-white/8" />
                        <div className="h-3 w-full animate-pulse rounded bg-white/8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <XCircle className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Failed to load notifications</p>
                  <button
                    onClick={() => refetch()}
                    className="text-xs text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-60" />
                  <p className="text-xs">All systems nominal</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => {
                    const cfg = severityConfig[notif.severity];
                    const Icon = notif.title.startsWith("AI:") ? Brain : notif.title.includes("System") ? Zap : cfg.icon;
                    const isRead = notif.read || readIds.has(notif.id);

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] cursor-default",
                          !isRead && "bg-white/[0.02]"
                        )}
                        onClick={() =>
                          setReadIds((prev) => { const s = new Set(prev); s.add(notif.id); return s; })
                        }
                      >
                        {/* Icon */}
                        <div className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                          cfg.ring
                        )}>
                          <Icon className={cn("h-4 w-4", cfg.text)} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-[12px] font-semibold leading-tight",
                              isRead ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {notif.title}
                            </p>
                            {!isRead && (
                              <span className={cn(
                                "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                                cfg.dot
                              )} />
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                            {notif.body}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                            <Clock className="h-3 w-3" />
                            {timeAgo(notif.time)}
                            <span className={cn(
                              "ml-1 rounded px-1.5 py-0.5 font-medium",
                              cfg.badge
                            )}>
                              {notif.severity}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && !isError && data && (
              <div className="border-t border-white/8 px-4 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground/50">
                  Live · refreshes every 60s ·{" "}
                  {data.systemHealth.totalInverters} inverters monitored
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
