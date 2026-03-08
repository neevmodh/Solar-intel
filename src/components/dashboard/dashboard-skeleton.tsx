/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Dashboard Loading Skeleton
 * ─────────────────────────────────────────────────────────
 * Graceful loading state that mirrors the actual dashboard
 * layout. Uses Shadcn Skeleton with subtle shimmer.
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* ── Risk Overview Cards Skeleton ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="border border-border/50 bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Middle Row Skeleton ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Trend Chart */}
        <div className="lg:col-span-3">
          <Card className="border border-border/50 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-10 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-2">
          <Card className="border border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-14 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Inverter Table Skeleton ── */}
      <Card className="border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="space-y-0">
            {/* Header row */}
            <div className="flex gap-8 border-b border-border/50 px-6 py-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-8 border-b border-border/20 px-6 py-4"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-1.5 w-16 rounded-full" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="ml-auto h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
