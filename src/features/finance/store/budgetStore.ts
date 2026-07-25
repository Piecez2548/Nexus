import { create } from "zustand";
import { budgetService } from "@/features/finance/services/budgetService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Budget } from "@/features/finance/types";

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  error: string | null;

  loadBudgets: () => Promise<void>;
  addBudget: (budget: Budget) => Promise<void>;
  updateBudget: (id: number, budget: Budget) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
}

export const useBudgetStore =
  create<BudgetState>((set) => ({
    budgets: [],
    ...initialAsyncState,

    loadBudgets: async () => {
      set({ loading: true, error: null });

      try {
        const budgets = await budgetService.list();
        set({ budgets, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addBudget(budget) {
      await budgetService.create(budget);
      const budgets = await budgetService.list();
      set({ budgets });
    },

    async updateBudget(id, budget) {
      await budgetService.update(id, budget);
      const budgets = await budgetService.list();
      set({ budgets });
    },

    async deleteBudget(id) {
      await budgetService.remove(id);
      const budgets = await budgetService.list();
      set({ budgets });
    },
  }));
