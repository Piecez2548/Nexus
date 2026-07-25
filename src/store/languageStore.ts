import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "th";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

// Defaults to Thai — the app's primary audience — but every string is
// available in both languages so switching is instant and total (no page
// reload, nothing left behind in the other language).
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "th",
      setLanguage: (language) => set({ language }),
    }),
    { name: "nexus-language" }
  )
);
