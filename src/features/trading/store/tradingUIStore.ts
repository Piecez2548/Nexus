import { create } from "zustand";
import type { Trade } from "../types";

interface TradingUIState {
  isTradeDrawerOpen: boolean;
  selectedTrade: Trade | null;

  openTradeDrawer: (trade?: Trade) => void;
  closeTradeDrawer: () => void;
}

export const useTradingUIStore = create<TradingUIState>((set) => ({
  isTradeDrawerOpen: false,
  selectedTrade: null,

  openTradeDrawer: (trade) =>
    set({
      isTradeDrawerOpen: true,
      selectedTrade: trade ?? null,
    }),

  closeTradeDrawer: () =>
    set({
      isTradeDrawerOpen: false,
      selectedTrade: null,
    }),
}));
