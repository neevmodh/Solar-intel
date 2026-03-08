/**
 * LanguageSwitcher — compact dropdown for header.
 * Shows current language flag + code. Clicking opens a popover with all 14 options.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";
import { LANGUAGES, type LangCode } from "@/lib/i18n/locales";

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
          open && "bg-white/10 text-foreground"
        )}
        title="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-mono text-[11px] uppercase">{current.code}</span>
        <span>{current.flag}</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full z-50 mt-2 w-52 origin-top-right",
              "rounded-xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl",
              "overflow-hidden"
            )}
          >
            <div className="p-1.5">
              <p className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Select Language
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
                      lang === l.code
                        ? "bg-emerald-500/15 text-emerald-400 font-medium"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="truncate">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
