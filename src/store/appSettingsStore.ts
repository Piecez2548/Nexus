import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "system";
export type Currency = "THB" | "USD" | "EUR" | "GBP" | "JPY";
export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type NumberFormat = "1,234.56" | "1.234,56" | "1 234.56";

interface AppSettingsState {
  themeMode: ThemeMode;
  currency: Currency;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;

  setThemeMode: (mode: ThemeMode) => void;
  setCurrency: (currency: Currency) => void;
  setDateFormat: (format: DateFormat) => void;
  setNumberFormat: (format: NumberFormat) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      currency: "THB",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "1,234.56",

      setThemeMode: (themeMode) => set({ themeMode }),
      setCurrency: (currency) => set({ currency }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
    }),
    { name: "nexus-app-settings" }
  )
);
