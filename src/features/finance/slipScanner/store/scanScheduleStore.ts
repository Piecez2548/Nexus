import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_SCAN_SCHEDULE, type ScanScheduleConfig } from "@/features/finance/slipScanner/schedule/scanScheduler";

// Persists the smart-scan schedule config and the last-completed-scan time
// (used by decideScan's interval gate). Config only — no slip content.
interface ScanScheduleState {
  config: ScanScheduleConfig;
  lastScanAt: number | null;
  setConfig: (patch: Partial<ScanScheduleConfig>) => void;
  markScanned: (at?: number) => void;
  reset: () => void;
}

export const useScanScheduleStore = create<ScanScheduleState>()(
  persist(
    (set) => ({
      config: DEFAULT_SCAN_SCHEDULE,
      lastScanAt: null,
      setConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
      markScanned: (at = Date.now()) => set({ lastScanAt: at }),
      reset: () => set({ config: DEFAULT_SCAN_SCHEDULE, lastScanAt: null }),
    }),
    { name: "nexus-scan-schedule" },
  ),
);
