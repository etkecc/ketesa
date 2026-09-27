import { merge } from "lodash";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { resolveBrowserLocale } from "react-admin";

import type { SynapseTranslationMessages } from "./types";
import { loadCountryLocale } from "../utils/countries";

const supportedLocales = ["en", "de", "fa", "fr", "it", "ja", "pt", "ru", "uk", "zh"] as const;
type SupportedLocale = (typeof supportedLocales)[number];

const localeLabels: { locale: SupportedLocale; name: string }[] = [
  { locale: "en", name: "English" },
  { locale: "de", name: "Deutsch" },
  { locale: "fr", name: "Français" },
  { locale: "it", name: "Italiano" },
  { locale: "ja", name: "日本語" },
  { locale: "fa", name: "فارسی" },
  { locale: "pt", name: "Português" },
  { locale: "ru", name: "Русский" },
  { locale: "uk", name: "Українська" },
  { locale: "zh", name: "简体中文" },
];

const loaders: Record<SupportedLocale, () => Promise<SynapseTranslationMessages>> = {
  en: () => import("./en").then(m => m.default),
  de: () => import("./de").then(m => m.default),
  fa: () => import("./fa").then(m => m.default),
  fr: () => import("./fr").then(m => m.default),
  it: () => import("./it").then(m => m.default),
  ja: () => import("./ja").then(m => m.default),
  pt: () => import("./pt").then(m => m.default),
  ru: () => import("./ru").then(m => m.default),
  uk: () => import("./uk").then(m => m.default),
  zh: () => import("./zh").then(m => m.default),
};

// Read locale directly from localStorage; runs before React mounts, so useLocale() isn't available yet.
const RA_STORE_LOCALE_KEY = "RaStore.locale";

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

function resolveInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem(RA_STORE_LOCALE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as string;
      if (isSupportedLocale(parsed)) {
        return parsed;
      }
    } catch {
      // malformed JSON, fall through to browser locale
    }
  }
  const browser = resolveBrowserLocale();
  return isSupportedLocale(browser) ? browser : "en";
}

export async function createI18nProvider() {
  const initialLocale = resolveInitialLocale();

  const setHtmlLang = (locale: string) => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  };

  const enMessages = await loaders.en();
  const initialMessages = initialLocale !== "en" ? merge({}, enMessages, await loaders[initialLocale]()) : enMessages;
  // country names ride the same lifecycle as the messages: registered before the app renders.
  await loadCountryLocale(initialLocale);
  setHtmlLang(initialLocale);

  const cache: Partial<Record<SupportedLocale, SynapseTranslationMessages>> = {
    en: enMessages,
    [initialLocale]: initialMessages,
  };

  return polyglotI18nProvider(
    locale => {
      const cached = cache[locale as SupportedLocale];
      if (cached) {
        setHtmlLang(locale);
        return cached;
      }
      if (!isSupportedLocale(locale)) {
        setHtmlLang("en");
        return enMessages;
      }
      return Promise.all([loaders[locale](), loadCountryLocale(locale)]).then(([msgs]) => {
        const merged = merge({}, enMessages, msgs);
        cache[locale] = merged;
        setHtmlLang(locale);
        return merged;
      });
    },
    initialLocale,
    localeLabels
  );
}
