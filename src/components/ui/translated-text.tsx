/**
 * TranslatedText — translates ANY content via Google Translate API.
 *
 * Handles BOTH static labels AND dynamic data (inverter names, AI summaries,
 * alert descriptions, etc.) — one batched API call per page per language.
 *
 * Usage:
 *   <TranslatedText text="Inverter temperature critical" />
 *   <TranslatedText text={insight.summary} as="p" />
 *   const label = useTranslated("Performance Ratio")  // for attributes/placeholders
 *
 * - If lang === "en" → renders text immediately (zero API calls).
 * - Otherwise → renders source text instantly, silently replaces with
 *   translation once the batched API response arrives (~60ms debounce).
 * - All instances on a page share ONE batched API call.
 * - Results cached in-module so repeated renders are instant.
 */
"use client";

import { useEffect, useState, useRef } from "react";
import { useLang } from "@/lib/i18n/context";
import { translateTexts } from "@/lib/i18n/translate-api";

// ── Global batching queue ─────────────────────────────────────────────────────
type Resolver = (translated: string) => void;
const queue = new Map<string, Resolver[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentLang = "en";

function scheduleFlush(lang: string) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const texts = Array.from(queue.keys());
    if (!texts.length) return;
    const resolvers = new Map(queue);
    queue.clear();
    const translations = await translateTexts(texts, lang);
    resolvers.forEach((list, original) => {
      const result = translations[original] ?? original;
      list.forEach((r: Resolver) => r(result));
    });
  }, 60);
}

function enqueue(text: string, lang: string, resolve: Resolver) {
  if (lang !== currentLang) {
    queue.clear();
    currentLang = lang;
  }
  const existing = queue.get(text);
  if (existing) {
    existing.push(resolve);
  } else {
    queue.set(text, [resolve]);
  }
  scheduleFlush(lang);
}

// ── Hook: useTranslated ───────────────────────────────────────────────────────
// For use in attributes (placeholder, title, aria-label, etc.)

export function useTranslated(text: string): string {
  const { lang } = useLang();
  const [translated, setTranslated] = useState(text);
  const prevText = useRef(text);
  const prevLang = useRef(lang);

  useEffect(() => {
    if (text !== prevText.current || lang !== prevLang.current) {
      setTranslated(text);
      prevText.current = text;
      prevLang.current = lang;
    }
    if (lang === "en" || !text.trim()) return;
    enqueue(text, lang, (result) => setTranslated(result));
  }, [text, lang]);

  return translated;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TranslatedTextProps {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function TranslatedText({ text, as: Tag = "span", className }: TranslatedTextProps) {
  const { lang } = useLang();
  const [translated, setTranslated] = useState(text);
  const prevText = useRef(text);
  const prevLang = useRef(lang);

  useEffect(() => {
    if (text !== prevText.current || lang !== prevLang.current) {
      setTranslated(text);
      prevText.current = text;
      prevLang.current = lang;
    }
    if (lang === "en" || !text.trim()) return;
    enqueue(text, lang, (result) => setTranslated(result));
  }, [text, lang]);

  return <Tag className={className}>{translated}</Tag>;
}
