/**
 * Google Translate API helper.
 *
 * Strategy (optimised for speed & cost):
 *  1. Static chrome (nav, buttons) → pre-bundled JSON, zero API calls.
 *  2. Dynamic strings (e.g. inverter names, descriptions, alert messages)
 *     → single bulk POST to /api/translate which batches all texts,
 *       then caches the result in a module-level Map keyed by lang+hash.
 *     This means: one request per unique language per unique set of strings.
 *  3. Falls back gracefully (returns original text) if API key is missing.
 */

const translateCache = new Map<string, Record<string, string>>();

/** Cheap FNV-1a hash to create a cache key from an array of strings. */
function hashStrings(arr: string[]): string {
  let h = 2166136261;
  for (const s of arr) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
  }
  return h.toString(16);
}

/**
 * Translate an array of texts to the given language via our internal route.
 * Returns a map of original → translated.
 * Results are cached per (lang, content-hash).
 */
export async function translateTexts(
  texts: string[],
  target: string
): Promise<Record<string, string>> {
  if (!texts.length || target === "en") return {};

  const key = `${target}:${hashStrings(texts)}`;
  if (translateCache.has(key)) return translateCache.get(key)!;

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target }),
    });
    if (!res.ok) return {};
    const json = await res.json();
    const map = json.data as Record<string, string>;
    translateCache.set(key, map);
    return map;
  } catch {
    return {};
  }
}

/** Clear the client-side cache (useful in tests or on lang switch). */
export function clearTranslateCache() {
  translateCache.clear();
}
