import { create } from "zustand";
import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";

interface DashboardPeriodState {
  granularity: DashboardPeriodGranularity;
  setGranularity: (granularity: DashboardPeriodGranularity) => void;
}

export const useDashboardPeriodStore = create<DashboardPeriodState>((set) => ({
  granularity: "month",
  setGranularity: (granularity) => set({ granularity }),
}));
