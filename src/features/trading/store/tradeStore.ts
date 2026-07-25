import { create } from "zustand";
import { tradeService } from "@/features/trading/services/tradeService";
import { calculatePnl } from "@/features/trading/utils/pnl";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Trade } from "@/features/trading/types";

function awardTradeClosedXp(trade: Trade) {
  const pnl = calculatePnl(trade) ?? 0;
  useGamificationStore
    .getState()
    .addXp(pnl >= 0 ? XP_REWARDS.tradeClosedWin : XP_REWARDS.tradeClosedLoss);
}

interface TradeState {
  trades: Trade[];
  loading: boolean;
  error: string | null;

  loadTrades: () => Promise<void>;
  addTrade: (trade: Trade) => Promise<void>;
  updateTrade: (id: number, trade: Trade) => Promise<void>;
  deleteTrade: (id: number) => Promise<void>;
}

export const useTradeStore =
  create<TradeState>((set, get) => ({
    trades: [],
    ...initialAsyncState,

    loadTrades: async () => {
      set({ loading: true, error: null });

      try {
        const trades = await tradeService.list();
        set({ trades, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    // Mutation failures deliberately don't touch `error` — see
    // features/finance/store/transactionStore.ts for why.

    async addTrade(trade) {
      await tradeService.create(trade);
      if (trade.status === "closed") awardTradeClosedXp(trade);
      const trades = await tradeService.list();
      set({ trades });
    },

    async updateTrade(id, trade) {
      const previous = get().trades.find((t) => t.id === id);
      await tradeService.update(id, trade);
      if (trade.status === "closed" && previous?.status !== "closed") {
        awardTradeClosedXp(trade);
      }
      const trades = await tradeService.list();
      set({ trades });
    },

    async deleteTrade(id) {
      await tradeService.remove(id);
      const trades = await tradeService.list();
      set({ trades });
    },
  }));
