import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  emptyTotals,
  mergeRun,
  type ScannerAnalyticsTotals,
  type ScannerRunStats,
} from "@/features/finance/slipScanner/analytics/scannerAnalytics";

// Persists cumulative scanner analytics across sessions. Holds only aggregate
// counters (no slip content), folded via the pure mergeRun. Derivation of rates
// lives in the analytics module / hook, not here.
interface ScannerAnalyticsState {
  totals: ScannerAnalyticsTotals;
  recordRun: (run: ScannerRunStats) => void;
  reset: () => void;
}

export const useScannerAnalyticsStore = create<ScannerAnalyticsState>()(
  persist(
    (set) => ({
      totals: emptyTotals(),
      recordRun: (run) => set((state) => ({ totals: mergeRun(state.totals, run) })),
      reset: () => set({ totals: emptyTotals() }),
    }),
    { name: "nexus-scanner-analytics" },
  ),
);
