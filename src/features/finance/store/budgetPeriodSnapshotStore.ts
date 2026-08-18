import { create } from "zustand";
import { budgetPeriodSnapshotService } from "@/features/finance/services/budgetPeriodSnapshotService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { BudgetPeriodSnapshot } from "@/features/finance/types";

interface BudgetPeriodSnapshotState {
  snapshots: BudgetPeriodSnapshot[];
  loading: boolean;
  error: string | null;

  loadSnapshots: () => Promise<void>;
}

export const useBudgetPeriodSnapshotStore = create<BudgetPeriodSnapshotState>((set) => ({
  snapshots: [],
  ...initialAsyncState,

  loadSnapshots: async () => {
    set({ loading: true, error: null });

    try {
      const snapshots = await budgetPeriodSnapshotService.list();
      set({ snapshots, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },
}));
