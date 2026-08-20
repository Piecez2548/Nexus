import { create } from "zustand";
import { persist } from "zustand/middleware";

// Local, device-only config -- mirrors appSettingsStore's exact pattern
// (persist to localStorage, no Dexie table, no sync). Kept as its own store
// rather than folded into appSettingsStore since this is trading-specific,
// not a general display preference.
interface RiskConfigState {
  // null means "no limit set" -- distinct from 0, which would mean "alert on
  // any loss at all."
  maxDailyLossLimit: number | null;
  maxWeeklyLossLimit: number | null;

  setMaxDailyLossLimit: (value: number | null) => void;
  setMaxWeeklyLossLimit: (value: number | null) => void;
}

export const useRiskConfigStore = create<RiskConfigState>()(
  persist(
    (set) => ({
      maxDailyLossLimit: null,
      maxWeeklyLossLimit: null,

      setMaxDailyLossLimit: (maxDailyLossLimit) => set({ maxDailyLossLimit }),
      setMaxWeeklyLossLimit: (maxWeeklyLossLimit) => set({ maxWeeklyLossLimit }),
    }),
    { name: "nexus-trading-risk-config" }
  )
);
