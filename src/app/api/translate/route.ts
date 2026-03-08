/**
 * POST /api/translate
 * Two-tier translation:
 *  1. If GOOGLE_TRANSLATE_API_KEY is set & working → Cloud Translation v2 (paid).
 *  2. Otherwise → free Google Translate endpoint (no key needed, no billing).
 *
 * Receives { texts: string[], target: string }
 * Returns  { data: Record<originalText, translatedText> }
 */
import { NextRequest, NextResponse } from "next/server";

/* ── Server-side translation cache (survives across requests) ──────────────── */
const serverCache = new Map<string, string>(); // "lang:text" → translated

/* ── Tier 1: Official Cloud Translation v2 ─────────────────────────────────── */
const GOOGLE_CLOUD_URL =
  "https://translation.googleapis.com/language/translate/v2";

/* ── Tier 2: Free Google Translate (same as translate.google.com) ──────────── */
const FREE_URL =
  "https://translate.googleapis.com/translate_a/single";

/**
 * Translate texts via the FREE endpoint (no API key required).
 * Sends up to CONCURRENCY parallel requests for speed.
 */
async function freeTranslate(
  texts: string[],
  target: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const CONCURRENCY = 5;

  // Process in parallel batches of CONCURRENCY
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (text) => {
      try {
        const params = new URLSearchParams({
          client: "gtx",
          sl: "en",
          tl: target,
          dt: "t",
          q: text,
        });
        const res = await fetch(`${FREE_URL}?${params.toString()}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) return { text, translated: text };
        const json = await res.json();
        const sentences: string[] = [];
        if (Array.isArray(json) && Array.isArray(json[0])) {
          for (const seg of json[0]) {
            if (Array.isArray(seg) && typeof seg[0] === "string") {
              sentences.push(seg[0]);
            }
          }
        }
        return { text, translated: sentences.length > 0 ? sentences.join("") : text };
      } catch {
        return { text, translated: text };
      }
    });
    const results = await Promise.all(promises);
    for (const r of results) {
      result[r.text] = r.translated;
    }
  }
  return result;
}

/**
 * Translate one batch via Cloud Translation v2 (requires API key).
 */
async function cloudTranslate(
  texts: string[],
  target: string,
  apiKey: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // Split into batches for large payloads
  const batches: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;
  for (const t of texts) {
    if (currentLen + t.length > 30_000 && current.length) {
      batches.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(t);
    currentLen += t.length;
  }
  if (current.length) batches.push(current);

  for (const batch of batches) {
    try {
      const params = new URLSearchParams({ key: apiKey, target, format: "text" });
      batch.forEach((t) => params.append("q", t));

      const res = await fetch(`${GOOGLE_CLOUD_URL}?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.ok) {
        // Cloud failed → fall through to free for this batch
        const free = await freeTranslate(batch, target);
        Object.assign(result, free);
        continue;
      }

      const json = await res.json();
      const translations: { translatedText: string }[] =
        json?.data?.translations ?? [];

      batch.forEach((original, idx) => {
        result[original] = translations[idx]?.translatedText ?? original;
      });
    } catch {
      // Cloud errored → fall through to free
      const free = await freeTranslate(batch, target);
      Object.assign(result, free);
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const texts: string[] = (body.texts ?? []).filter(
      (t: unknown) => typeof t === "string" && t.trim().length > 0
    );
    const target: string = body.target ?? "en";

    if (!texts.length || target === "en") {
      return NextResponse.json({ data: {} });
    }

    // Split into cached vs uncached
    const result: Record<string, string> = {};
    const uncached: string[] = [];
    for (const t of texts) {
      const cacheKey = `${target}:${t}`;
      const cached = serverCache.get(cacheKey);
      if (cached) {
        result[t] = cached;
      } else {
        uncached.push(t);
      }
    }

    // Translate only uncached texts
    if (uncached.length > 0) {
      const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY ?? "";
      let translated: Record<string, string>;

      if (apiKey) {
        translated = await cloudTranslate(uncached, target, apiKey);
      } else {
        translated = await freeTranslate(uncached, target);
      }

      // Populate cache & merge into result
      for (const [original, translation] of Object.entries(translated)) {
        serverCache.set(`${target}:${original}`, translation);
        result[original] = translation;
      }
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ data: {} }, { status: 200 });
  }
}
