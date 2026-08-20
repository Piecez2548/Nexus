import { create } from "zustand";
import { watchlistService } from "@/features/trading/services/watchlistService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { WatchlistItem } from "@/features/trading/types";

interface WatchlistState {
  watchlistItems: WatchlistItem[];
  loading: boolean;
  error: string | null;

  loadWatchlistItems: () => Promise<void>;
  addWatchlistItem: (item: WatchlistItem) => Promise<void>;
  updateWatchlistItem: (id: number, item: WatchlistItem) => Promise<void>;
  deleteWatchlistItem: (id: number) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  watchlistItems: [],
  ...initialAsyncState,

  loadWatchlistItems: async () => {
    set({ loading: true, error: null });

    try {
      const watchlistItems = await watchlistService.list();
      set({ watchlistItems, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addWatchlistItem(item) {
    await watchlistService.create(item);
    const watchlistItems = await watchlistService.list();
    set({ watchlistItems });
  },

  async updateWatchlistItem(id, item) {
    await watchlistService.update(id, item);
    const watchlistItems = await watchlistService.list();
    set({ watchlistItems });
  },

  async deleteWatchlistItem(id) {
    await watchlistService.remove(id);
    const watchlistItems = await watchlistService.list();
    set({ watchlistItems });
  },
}));
