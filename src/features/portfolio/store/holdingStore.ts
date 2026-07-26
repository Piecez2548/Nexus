import { create } from "zustand";
import { holdingService } from "@/features/portfolio/services/holdingService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Holding } from "@/features/portfolio/types";

interface HoldingState {
  holdings: Holding[];
  loading: boolean;
  error: string | null;

  loadHoldings: () => Promise<void>;
  addHolding: (holding: Holding) => Promise<void>;
  updateHolding: (id: number, holding: Holding) => Promise<void>;
  deleteHolding: (id: number) => Promise<void>;
  updateCurrentPrice: (id: number, price: number) => Promise<void>;
}

export const useHoldingStore =
  create<HoldingState>((set, get) => ({
    holdings: [],
    ...initialAsyncState,

    loadHoldings: async () => {
      set({ loading: true, error: null });

      try {
        const holdings = await holdingService.list();
        set({ holdings, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addHolding(holding) {
      await holdingService.create(holding);
      const holdings = await holdingService.list();
      set({ holdings });
    },

    async updateHolding(id, holding) {
      await holdingService.update(id, holding);
      const holdings = await holdingService.list();
      set({ holdings });
    },

    async deleteHolding(id) {
      await holdingService.remove(id);
      const holdings = await holdingService.list();
      set({ holdings });
    },

    // A direct set, not additive (unlike Goal's contribute()) — there is no
    // second, different operation this could be confused with, so it isn't
    // also exposed as a HoldingForm field.
    async updateCurrentPrice(id, price) {
      const existing = get().holdings.find((h) => h.id === id);
      if (!existing) return;

      await holdingService.update(id, {
        ...existing,
        currentPrice: price,
        currentPriceUpdatedAt: new Date().toISOString(),
      });

      const holdings = await holdingService.list();
      set({ holdings });
    },
  }));
