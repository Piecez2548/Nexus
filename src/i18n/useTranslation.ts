import { useLanguageStore } from "@/store/languageStore";
import { translations } from "./translations";

function getNested(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ""));
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  function t(key: string, params?: Record<string, string | number>): string {
    const value = getNested(translations[language], key);
    if (typeof value !== "string") return key;
    return interpolate(value, params);
  }

  return { t, language };
}

// Usable outside React (e.g. a Zustand store, which can't call hooks) — a
// one-off lookup for something like a native notification's title/body.
// Reads the current language directly from the store's state rather than
// subscribing to it, so it never triggers a re-render.
export function translate(key: string, params?: Record<string, string | number>): string {
  const language = useLanguageStore.getState().language;
  const value = getNested(translations[language], key);
  if (typeof value !== "string") return key;
  return interpolate(value, params);
}
