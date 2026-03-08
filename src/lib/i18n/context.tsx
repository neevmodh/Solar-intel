/**
 * Language Context — provides active language + t() to the whole app.
 * Language is persisted in localStorage so it survives refreshes.
 */
"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode,
} from "react";
import { DEFAULT_LANG, type LangCode } from "./locales";
import { getTranslation, type TranslationKey } from "./translations";

type LangContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  /** Translate a static UI key — instant, no API call */
  t: (key: TranslationKey) => string;
};

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => getTranslation(DEFAULT_LANG, key),
});

const LS_KEY = "solar-intel-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as LangCode | null;
      if (saved) setLangState(saved);
    } catch {}
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try { localStorage.setItem(LS_KEY, next); } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => getTranslation(lang, key),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
