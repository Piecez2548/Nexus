import { create } from "zustand";
import { strategyService } from "@/features/trading/services/strategyService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Strategy } from "@/features/trading/types";

interface StrategyState {
  strategies: Strategy[];
  loading: boolean;
  error: string | null;

  loadStrategies: () => Promise<void>;
  addStrategy: (strategy: Strategy) => Promise<void>;
  updateStrategy: (id: number, strategy: Strategy) => Promise<void>;
  deleteStrategy: (id: number) => Promise<void>;
}

export const useStrategyStore = create<StrategyState>((set) => ({
  strategies: [],
  ...initialAsyncState,

  loadStrategies: async () => {
    set({ loading: true, error: null });

    try {
      const strategies = await strategyService.list();
      set({ strategies, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addStrategy(strategy) {
    await strategyService.create(strategy);
    const strategies = await strategyService.list();
    set({ strategies });
  },

  async updateStrategy(id, strategy) {
    await strategyService.update(id, strategy);
    const strategies = await strategyService.list();
    set({ strategies });
  },

  async deleteStrategy(id) {
    await strategyService.remove(id);
    const strategies = await strategyService.list();
    set({ strategies });
  },
}));
