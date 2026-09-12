import { useCallback } from "react";
import { useLanguageStore } from "@/store/languageStore";

export type Dictionary = Record<"en" | "th", unknown>;
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function translateFrom(dictionary: unknown, key: string, params?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    return acc && typeof acc === "object" && part in acc
      ? (acc as Record<string, unknown>)[part]
      : undefined;
  }, dictionary);
  if (typeof value !== "string") return key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ""));
}

export function useDictionaryTranslation(dictionary: Dictionary) {
  const language = useLanguageStore((state) => state.language);
  const t = useCallback<TranslateFn>(
    (key, params) => translateFrom(dictionary[language], key, params),
    [dictionary, language],
  );
  return { t, language };
}
