import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import {
  resolveLocale,
  getTranslations,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type Translations,
} from "@breview/shared";

const LOCALE_STORAGE_KEY = "breview_locale_v1";

interface I18nContextType {
  lang: SupportedLocale;
  t: Translations;
  setLang: (lang: SupportedLocale) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLocale>("fi");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadStoredLang() {
      try {
        const stored = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
        if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
          setLangState(stored as SupportedLocale);
          setIsLoaded(true);
          return;
        }
      } catch {
        // ignore
      }
      
      try {
        const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        const resolved = resolveLocale([systemLocale]);
        setLangState(resolved);
      } catch {
        // fallback
      } finally {
        setIsLoaded(true);
      }
    }
    void loadStoredLang();
  }, []);

  const setLang = async (newLang: SupportedLocale) => {
    setLangState(newLang);
    try {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const contextValue = useMemo(() => ({
    lang,
    t: getTranslations(lang),
    setLang,
  }), [lang]);

  if (!isLoaded) {
    return null;
  }

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useT must be used within an I18nProvider");
  }
  return context.t;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
