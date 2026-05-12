import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@breview/shared";
import { useI18n } from "../i18n/i18nContext";

const LOCALE_FLAGS: Record<string, string> = {
  fi: "🇫🇮",
  en: "🇬🇧",
  sv: "🇸🇪",
  nl: "🇳🇱",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      className="min-h-8 w-auto cursor-pointer appearance-none rounded-lg border border-line bg-[#1b1d22] py-1 pl-2 pr-7 text-xs font-semibold text-muted focus:outline-none focus:ring-2 focus:ring-amber-400/60"
      value={locale}
      onChange={(event) => setLocale(event.target.value as typeof locale)}
      aria-label={t.nav.language}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_FLAGS[loc] ?? ""} {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
