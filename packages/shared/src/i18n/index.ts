export { SUPPORTED_LOCALES, type SupportedLocale, type Translations } from "./types";
export { fi } from "./fi";
export { en } from "./en";
export { sv } from "./sv";
export { nl } from "./nl";

import { SUPPORTED_LOCALES, type SupportedLocale, type Translations } from "./types";
import { fi } from "./fi";
import { en } from "./en";
import { sv } from "./sv";
import { nl } from "./nl";

const LOCALE_MAP: Record<SupportedLocale, Translations> = { fi, en, sv, nl };

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  se: "sv",
  "sv-se": "sv",
  "sv-fi": "sv",
  "nl-be": "nl",
  "nl-nl": "nl",
  "en-us": "en",
  "en-gb": "en",
  "en-au": "en",
  "fi-fi": "fi",
};

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
  nl: "Nederlands",
};

export function resolveLocale(preferredLocales: readonly string[] = []): SupportedLocale {
  for (const rawLocale of preferredLocales) {
    const locale = String(rawLocale ?? "").trim();
    if (!locale) continue;

    const normalized = locale.replace("_", "-").toLowerCase();
    const exact = SUPPORTED_LOCALES.find((item) => item.toLowerCase() === normalized);
    if (exact) return exact;

    const alias = LOCALE_ALIASES[normalized];
    if (alias) return alias;

    const language = normalized.split("-")[0];
    const languageAlias = LOCALE_ALIASES[language];
    if (languageAlias) return languageAlias;

    const byLanguage = SUPPORTED_LOCALES.find((item) => item.toLowerCase().split("-")[0] === language);
    if (byLanguage) return byLanguage;
  }

  return "en";
}

export function getTranslations(locale: SupportedLocale): Translations {
  return LOCALE_MAP[locale] ?? LOCALE_MAP.en;
}

export function getTranslationsForPreferred(preferredLocales: readonly string[] = []): Translations {
  return getTranslations(resolveLocale(preferredLocales));
}

// Backward-compatible re-export for existing WelcomeCopy consumers
export type WelcomeCopy = Translations["welcome"];

export function getWelcomeCopy(preferredLocales: readonly string[] = []): WelcomeCopy & { locale: SupportedLocale; dir: "ltr" | "rtl" } {
  const locale = resolveLocale(preferredLocales);
  const t = getTranslations(locale);
  return {
    locale,
    dir: "ltr",
    ...t.welcome,
  };
}
