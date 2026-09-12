import { useLanguageStore } from "@/store/languageStore";
import { translations } from "./translations";
import { translateFrom, useDictionaryTranslation } from "./dictionary";
export type { TranslateFn } from "./dictionary";

export function useTranslation() {
  return useDictionaryTranslation(translations);
}

// Keep synchronous translation available to stores and native notifications.
export function translate(key: string, params?: Record<string, string | number>): string {
  return translateFrom(translations[useLanguageStore.getState().language], key, params);
}
