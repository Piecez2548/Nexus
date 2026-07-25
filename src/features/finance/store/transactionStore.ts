import { create } from "zustand";
import { transactionService } from "@/features/finance/services/transactionService";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Transaction } from "@/features/finance/types";

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  loadTransactions: () => Promise<void>;

  addTransaction: (
    transaction: Transaction
  ) => Promise<void>;

  updateTransaction: (
    id: number,
    transaction: Transaction
  ) => Promise<void>;

  deleteTransaction: (
    id: number
  ) => Promise<void>;

  toggleFavorite: (
    transaction: Transaction
  ) => Promise<void>;
}

export const useTransactionStore =
create<TransactionState>((set) => ({

  transactions: [],
  ...initialAsyncState,

  async loadTransactions() {
    set({ loading: true, error: null });

    try {
      const data = await transactionService.list();
      set({ transactions: data, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  // Mutation failures are intentionally NOT written to `error` — that field
  // represents the shared list-load state. Mutations throw so the calling
  // component (which knows the specific action that failed) can show its
  // own local error feedback instead of hijacking the page-level state.

  async addTransaction(transaction) {
    await transactionService.create(transaction);
    useGamificationStore.getState().addXp(XP_REWARDS.transactionLogged);
    const data = await transactionService.list();
    set({ transactions: data });
  },

  async updateTransaction(id, transaction) {
    await transactionService.update(id, transaction);
    const data = await transactionService.list();
    set({ transactions: data });
  },

  async deleteTransaction(id) {
    await transactionService.remove(id);
    const data = await transactionService.list();
    set({ transactions: data });
  },

  async toggleFavorite(transaction) {
    if (transaction.id === undefined) return;

    await transactionService.update(transaction.id, {
      ...transaction,
      favorite: !transaction.favorite,
    });

    const data = await transactionService.list();
    set({ transactions: data });
  },

}));
