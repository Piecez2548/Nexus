import { create } from "zustand";
import { netWorthSnapshotService } from "@/features/finance/services/netWorthSnapshotService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { NetWorthSnapshot } from "@/features/finance/types";

interface NetWorthSnapshotState {
  snapshots: NetWorthSnapshot[];
  loading: boolean;
  error: string | null;

  loadSnapshots: () => Promise<void>;
}

export const useNetWorthSnapshotStore = create<NetWorthSnapshotState>((set) => ({
  snapshots: [],
  ...initialAsyncState,

  loadSnapshots: async () => {
    set({ loading: true, error: null });

    try {
      const snapshots = await netWorthSnapshotService.list();
      set({ snapshots, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },
}));
