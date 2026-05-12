import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  resolveLocale,
  getTranslations,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type Translations,
} from "@breview/shared";

const STORAGE_KEY = "breview_locale";

function loadStoredLocale(): SupportedLocale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as SupportedLocale;
    }
  } catch {
    // Storage unavailable.
  }
  return null;
}

function detectLocale(): SupportedLocale {
  const stored = loadStoredLocale();
  if (stored) return stored;

  if (typeof navigator !== "undefined") {
    const languages = Array.from(navigator.languages ?? [navigator.language]);
    return resolveLocale(languages);
  }

  return "fi";
}

interface I18nContextValue {
  locale: SupportedLocale;
  t: Translations;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectLocale);

  const t = useMemo(() => getTranslations(locale), [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-persistent locale is fine when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export function useT(): Translations {
  return useI18n().t;
}
