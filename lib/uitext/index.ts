// Interface-language lookup for SiteGenie's own screens. Missing keys fall back to English.
// (Generated customer websites use lib/i18n.ts instead, and are never touched by this.)
import { en, type UiDict, type UiKey } from "./en";
import { hi } from "./hi";
import { kn } from "./kn";
import { ta } from "./ta";
import { te } from "./te";

export type Locale = "en" | "kn" | "hi" | "ta" | "te";
export type { UiKey };

// `speech` is the name the speech chooser uses (components/useSpeech LANGUAGES), so the two
// choosers stay independent but can offer to match each other.
export const UI_LOCALES: { code: Locale; label: string; speech: string }[] = [
  { code: "en", label: "English", speech: "English" },
  { code: "kn", label: "ಕನ್ನಡ", speech: "Kannada" },
  { code: "hi", label: "हिन्दी", speech: "Hindi" },
  { code: "ta", label: "தமிழ்", speech: "Tamil" },
  { code: "te", label: "తెలుగు", speech: "Telugu" },
];

const DICTS: Record<Locale, UiDict> = { en, kn, hi, ta, te };

export const isLocale = (v: unknown): v is Locale => UI_LOCALES.some((l) => l.code === v);
export const localeForSpeech = (speech: string): Locale => UI_LOCALES.find((l) => l.speech === speech)?.code ?? "en";
export const nativeName = (code: Locale) => UI_LOCALES.find((l) => l.code === code)?.label ?? "English";

export function translate(locale: Locale, key: UiKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[locale]?.[key] ?? en[key];
  return vars ? raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : raw;
}
