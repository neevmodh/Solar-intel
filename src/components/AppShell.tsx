"use client";

/**
 * AppShell — wraps app layout with instant session awareness.
 * Unauthenticated users are redirected to /auth/signin.
 * Shows a branded loading screen only during the initial
 * session fetch (~200ms), then reveals the full UI.
 */

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname?.startsWith("/auth");

  useEffect(() => {
    if (status === "unauthenticated" && !isAuthPage) {
      router.replace("/auth/signin");
    }
  }, [status, isAuthPage, router]);

  // Show loading spinner while session is being fetched
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30"
          >
            <Sun className="h-8 w-8 text-white" />
          </motion.div>
          <p className="text-sm font-semibold tracking-widest text-white/40 uppercase">
            Solar Intel
          </p>
          <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Render the auth page without sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Unauthenticated — blank while redirect fires
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="flex min-h-screen"
      >
        <Sidebar />
        <div className="flex flex-1 flex-col pl-[240px]">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
