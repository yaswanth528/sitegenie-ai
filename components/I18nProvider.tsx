"use client";
// Interface language for SiteGenie's own screens. English by default; the visitor's choice is
// remembered in this browser. Independent of the speech language chosen on /create, and it
// never touches what the owner typed or what was generated for their website.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocale, translate, UI_LOCALES, type Locale, type UiKey } from "@/lib/uitext";

const KEY = "sg_ui_lang";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: UiKey, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx>({ locale: "en", setLocale: () => {}, t: (k, v) => translate("en", k, v) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read the saved choice after the first paint (keeps server and browser output identical).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (isLocale(saved)) setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;

// Drop-in text for server-rendered pages: <T k="navPricing" />
export function T({ k, vars }: { k: UiKey; vars?: Record<string, string | number> }) {
  return <>{useT()(k, vars)}</>;
}

// The visible language chooser (a native <select>, so it works with every keyboard and screen reader).
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`lang-switch ${className}`}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span className="lang-switch-name" aria-hidden="true">
        {UI_LOCALES.find((l) => l.code === locale)?.label}
      </span>
      <select aria-label={t("langAria")} value={locale} onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}>
        {UI_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
