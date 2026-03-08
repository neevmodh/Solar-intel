/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Top Header Bar (Production-Ready)
 * ─────────────────────────────────────────────────────────
 * User profile, global search with live results, and
 * real-time clock. Integrated with NextAuth session.
 *
 * Search covers:
 *  • Inverters (by name, ID, status)
 *  • Plants (by name, location)
 *  • Pages (navigate to any page)
 *  • Quick actions (export, refresh, etc.)
 */

"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { NotificationPanel } from "@/components/ui/notification-panel";
import { useLang } from "@/lib/i18n/context";
import {
  Search,
  LogIn,
  ChevronDown,
  LogOut,
  User,
  Radio,
  Factory,
  LayoutDashboard,
  TrendingUp,
  Brain,
  Network,
  Wrench,
  AlertTriangle,
  Sun,
  Leaf,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllInverters, fetchAllPlants } from "@/lib/api-client";

/* ── Page navigation items for search ── */
const pageItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, keywords: "home overview main" },
  { label: "Plants", href: "/plants", icon: Factory, keywords: "solar plant site location" },
  { label: "Inverters", href: "/inverters", icon: Radio, keywords: "inverter fleet device hardware" },
  { label: "Analytics", href: "/analytics", icon: TrendingUp, keywords: "analytics charts trends performance statistics data" },
  { label: "DISCOM / Grid", href: "/security", icon: Network, keywords: "grid discom net metering voltage frequency sync" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, keywords: "maintenance schedule repair task work order" },
  { label: "AI Insights", href: "/ai-insights", icon: Brain, keywords: "ai advisor intelligence prediction recommendation" },
  { label: "Chat Assistant", href: "/chat", icon: MessageSquare, keywords: "chat ask question assistant help" },
  { label: "Anomalies", href: "/anomalies", icon: AlertTriangle, keywords: "anomaly detection alert warning critical" },
  { label: "Solar Forecast", href: "/forecast", icon: Sun, keywords: "forecast prediction solar energy weather irradiance" },
  { label: "Carbon Impact", href: "/carbon", icon: Leaf, keywords: "carbon co2 emission green sustainability environment" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "settings profile configuration preferences" },
];

type SearchResult = {
  type: "page" | "inverter" | "plant";
  label: string;
  sub: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: string;
};

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLang();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ── Search state ── */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  /* ── Fetch data for search (lightweight, cached) ── */
  const { data: inverters } = useQuery({
    queryKey: ["allInverters"],
    queryFn: fetchAllInverters,
    staleTime: 120_000,
    enabled: searchOpen,
  });

  const { data: plants } = useQuery({
    queryKey: ["allPlants"],
    queryFn: fetchAllPlants,
    staleTime: 120_000,
    enabled: searchOpen,
  });

  /* ── Live clock — updates every minute ── */
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Close menu on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Keyboard shortcut: Cmd+K / Ctrl+K to open search ── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── Focus input when search opens ── */
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIdx(0);
    }
  }, [searchOpen]);

  /* ── Compute search results ── */
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show recent / popular pages
      return pageItems.slice(0, 6).map((p) => ({
        type: "page" as const,
        label: p.label,
        sub: `Go to ${p.label}`,
        href: p.href,
        icon: p.icon,
      }));
    }

    const matches: SearchResult[] = [];

    // Search pages
    pageItems.forEach((p) => {
      if (
        p.label.toLowerCase().includes(q) ||
        p.keywords.toLowerCase().includes(q)
      ) {
        matches.push({
          type: "page",
          label: p.label,
          sub: `Navigate to ${p.label}`,
          href: p.href,
          icon: p.icon,
        });
      }
    });

    // Search inverters
    if (inverters) {
      inverters
        .filter(
          (inv) =>
            inv.name.toLowerCase().includes(q) ||
            inv.id.toLowerCase().includes(q) ||
            inv.status.toLowerCase().includes(q) ||
            inv.location?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach((inv) => {
          matches.push({
            type: "inverter",
            label: inv.name,
            sub: `${inv.status.toUpperCase()} • ${inv.location || inv.plantId} • Risk: ${inv.riskScore}%`,
            href: `/inverters/${inv.id}`,
            icon: Radio,
            status: inv.status,
          });
        });
    }

    // Search plants
    if (plants) {
      plants
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .forEach((p) => {
          matches.push({
            type: "plant",
            label: p.name,
            sub: `${p.location} • ${p.capacity} MW • ${p.inverterCount} inverters`,
            href: `/plants`,
            icon: Factory,
          });
        });
    }

    return matches.slice(0, 10);
  }, [query, inverters, plants]);

  /* ── Reset selected index when results change ── */
  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length, query]);

  /* ── Navigate to result ── */
  const navigateTo = useCallback(
    (href: string) => {
      setSearchOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  /* ── Keyboard navigation in search ── */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        navigateTo(results[selectedIdx].href);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    },
    [results, selectedIdx, navigateTo]
  );

  // User initials for avatar fallback
  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SI";

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "sticky top-0 z-30 flex h-16 items-center justify-between",
          "border-b border-border/50 bg-surface-1/80 backdrop-blur-md px-6"
        )}
      >
        {/* ── Left: Page title + time ── */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {t("header.title")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("header.subtitle")}
            </p>
          </div>
          {currentTime && (
            <Badge
              variant="secondary"
              className="ml-2 font-mono text-[10px] text-muted-foreground"
            >
              {currentTime} UTC
            </Badge>
          )}
        </div>

        {/* ── Right: Actions + Language + Profile ── */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            title="Search (⌘K)"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border border-border/40 px-3",
              "text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <NotificationPanel />

          {/* Separator */}
          <div className="h-6 w-px bg-border/50" />

          {/* User Profile */}
          {session?.user ? (
            <div className="relative" ref={menuRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-xs font-medium text-foreground">
                    {session.user.name ?? "Operator"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Admin</span>
                </div>
                <ChevronDown className={cn(
                  "hidden h-3 w-3 text-muted-foreground md:block transition-transform duration-200",
                  menuOpen && "rotate-180"
                )} />
              </motion.button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border/50 bg-surface-1 shadow-xl z-50 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border/40">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {session.user.name ?? "Operator"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {session.user.email ?? ""}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { setMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <User className="h-3.5 w-3.5" />
                        Profile &amp; Settings
                      </button>

                      <button
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signIn("google")}
              className="gap-2 text-xs"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t("header.signIn")}
            </Button>
          )}
        </div>
      </motion.header>

      {/* ── Global Search Overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />

            {/* Search panel */}
            <motion.div
              ref={searchPanelRef}
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border/50 bg-surface-1 shadow-2xl overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search inverters, plants, pages…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    title="Clear search"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-xs">No results found for &quot;{query}&quot;</p>
                  </div>
                ) : (
                  <>
                    {!query && (
                      <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Quick Navigation
                      </p>
                    )}
                    {results.map((result, idx) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={`${result.type}-${result.href}-${idx}`}
                          onClick={() => navigateTo(result.href)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            idx === selectedIdx
                              ? "bg-emerald-500/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              result.type === "page"
                                ? "bg-blue-500/10"
                                : result.type === "inverter"
                                ? result.status === "critical"
                                  ? "bg-red-500/10"
                                  : result.status === "warning"
                                  ? "bg-yellow-500/10"
                                  : "bg-emerald-500/10"
                                : "bg-purple-500/10"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                result.type === "page"
                                  ? "text-blue-400"
                                  : result.type === "inverter"
                                  ? result.status === "critical"
                                    ? "text-red-400"
                                    : result.status === "warning"
                                    ? "text-yellow-400"
                                    : "text-emerald-400"
                                  : "text-purple-400"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {result.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {result.sub}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 capitalize shrink-0"
                          >
                            {result.type}
                          </Badge>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/50 px-1 font-mono">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/50 px-1 font-mono">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/50 px-1 font-mono">esc</kbd>
                    Close
                  </span>
                </div>
                <span>
                  {inverters?.length ?? 0} inverters • {plants?.length ?? 0} plants
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
