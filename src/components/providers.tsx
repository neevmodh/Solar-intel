/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Client Providers
 * ─────────────────────────────────────────────────────────
 * Wraps the app with React Query + NextAuth session +
 * Tooltip provider for global availability.
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/context";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Stable QueryClient instance — survives re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,   // 5 min — data stays fresh, no re-fetches on nav
            gcTime:    10 * 60_000,  // 10 min — keep in cache even when unmounted
            refetchOnWindowFocus: false,
            refetchOnMount: false,   // use cache on page revisit
            retry: 1,               // fail fast instead of retrying 2×
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
