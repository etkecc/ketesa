import { getAlpha2Codes, getName, registerLocale } from "i18n-iso-countries";
import type { LocaleData } from "i18n-iso-countries";

// name packs load on demand, one chunk per locale, mirroring the message loaders in src/i18n.
const loaders: Record<string, () => Promise<LocaleData>> = {
  de: () => import("i18n-iso-countries/langs/de.json").then(m => m.default),
  en: () => import("i18n-iso-countries/langs/en.json").then(m => m.default),
  fa: () => import("i18n-iso-countries/langs/fa.json").then(m => m.default),
  fr: () => import("i18n-iso-countries/langs/fr.json").then(m => m.default),
  it: () => import("i18n-iso-countries/langs/it.json").then(m => m.default),
  ja: () => import("i18n-iso-countries/langs/ja.json").then(m => m.default),
  pt: () => import("i18n-iso-countries/langs/pt.json").then(m => m.default),
  ru: () => import("i18n-iso-countries/langs/ru.json").then(m => m.default),
  uk: () => import("i18n-iso-countries/langs/uk.json").then(m => m.default),
  zh: () => import("i18n-iso-countries/langs/zh.json").then(m => m.default),
};

const registered: Record<string, true> = {};

// Registers one locale's country names, once; an unknown locale resolves and leaves codes unmapped.
export const loadCountryLocale = (locale: string): Promise<void> => {
  if (registered[locale]) return Promise.resolve();
  const loader = loaders[locale];
  if (!loader) return Promise.resolve();
  return loader().then(data => {
    registerLocale(data);
    registered[locale] = true;
  });
};

export const countryCodes = Object.keys(getAlpha2Codes());

export const countryName = (code: string, locale: string) => getName(code, locale) ?? getName(code, "en") ?? code;
