import { coreTranslations } from "./locales/core";
import { securityTranslations } from "./locales/security";
import { useDictionaryTranslation } from "./dictionary";

// Account entry needs neither financial analytics nor the Main feature copy.
// Reuse the same dictionaries and synchronous lookup as the full app.
const entryTranslations = {
  en: { ...coreTranslations.en, ...securityTranslations.en },
  th: { ...coreTranslations.th, ...securityTranslations.th },
};

export function useEntryTranslation() {
  return useDictionaryTranslation(entryTranslations);
}
