/**
 * Supported languages for Solar Intel's language switcher.
 * Add more ISO-639-1 codes freely — Google Translate supports 130+.
 */
export const LANGUAGES = [
  { code: "en",    label: "English",    flag: "🇬🇧" },
  { code: "hi",    label: "हिन्दी",       flag: "🇮🇳" },
  { code: "es",    label: "Español",    flag: "🇪🇸" },
  { code: "fr",    label: "Français",   flag: "🇫🇷" },
  { code: "de",    label: "Deutsch",    flag: "🇩🇪" },
  { code: "ar",    label: "العربية",    flag: "🇸🇦" },
  { code: "zh",    label: "中文",        flag: "🇨🇳" },
  { code: "ja",    label: "日本語",      flag: "🇯🇵" },
  { code: "pt",    label: "Português",  flag: "🇧🇷" },
  { code: "ru",    label: "Русский",    flag: "🇷🇺" },
  { code: "it",    label: "Italiano",   flag: "🇮🇹" },
  { code: "ko",    label: "한국어",       flag: "🇰🇷" },
  { code: "ta",    label: "தமிழ்",       flag: "🇮🇳" },
  { code: "nl",    label: "Nederlands", flag: "🇳🇱" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: LangCode = "en";
