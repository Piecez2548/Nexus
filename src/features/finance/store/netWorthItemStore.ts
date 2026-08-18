import { create } from "zustand";
import { netWorthItemService } from "@/features/finance/services/netWorthItemService";
import { recordSnapshot } from "@/features/finance/services/netWorthTrackingService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { NetWorthItem } from "@/features/finance/types";

interface NetWorthItemState {
  items: NetWorthItem[];
  loading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: NetWorthItem) => Promise<void>;
  updateItem: (id: number, item: NetWorthItem) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useNetWorthItemStore = create<NetWorthItemState>((set) => ({
  items: [],
  ...initialAsyncState,

  loadItems: async () => {
    set({ loading: true, error: null });

    try {
      const items = await netWorthItemService.list();
      set({ items, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addItem(item) {
    await netWorthItemService.create(item);
    const items = await netWorthItemService.list();
    set({ items });
    await recordSnapshot(items);
  },

  async updateItem(id, item) {
    await netWorthItemService.update(id, item);
    const items = await netWorthItemService.list();
    set({ items });
    await recordSnapshot(items);
  },

  async deleteItem(id) {
    await netWorthItemService.remove(id);
    const items = await netWorthItemService.list();
    set({ items });
    await recordSnapshot(items);
  },
}));
