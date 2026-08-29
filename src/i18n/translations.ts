// Two full dictionaries rather than a general-purpose i18n library — this
// app only ever needs an EN/TH toggle. Domain modules keep edits scoped
// while this facade preserves the original translations[language] API.
import { coreTranslations } from "./locales/core";
import { financeTranslations } from "./locales/finance";
import { tradingTranslations } from "./locales/trading";
import { lifeTranslations } from "./locales/life";
import { securityTranslations } from "./locales/security";
import { aiAnalyticsTranslations } from "./locales/aiAnalytics";

export const translations = {
  en: {
    ...coreTranslations.en,
    ...financeTranslations.en,
    ...tradingTranslations.en,
    ...lifeTranslations.en,
    ...securityTranslations.en,
    ...aiAnalyticsTranslations.en,
  },
  th: {
    ...coreTranslations.th,
    ...financeTranslations.th,
    ...tradingTranslations.th,
    ...lifeTranslations.th,
    ...securityTranslations.th,
    ...aiAnalyticsTranslations.th,
  },
} as const;

export type TranslationKey = string;
