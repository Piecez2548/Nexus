import { create } from "zustand";
import type { Transaction } from "@/features/finance/types";
import type { TransactionFormData } from "@/features/finance/schemas/transactionSchema";

interface UIState {
  isTransactionDrawerOpen: boolean;

  selectedTransaction: Transaction | null;
  draftTransaction: Partial<TransactionFormData> | null;

  openTransactionDrawer: (
    transaction?: Transaction
  ) => void;

  openTransactionDrawerWithDraft: (
    draft: Partial<TransactionFormData>
  ) => void;

  closeTransactionDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTransactionDrawerOpen: false,

  selectedTransaction: null,
  draftTransaction: null,

  openTransactionDrawer: (transaction) =>
    set({
      isTransactionDrawerOpen: true,
      selectedTransaction: transaction ?? null,
      draftTransaction: null,
    }),

  openTransactionDrawerWithDraft: (draft) =>
    set({
      isTransactionDrawerOpen: true,
      selectedTransaction: null,
      draftTransaction: draft,
    }),

  closeTransactionDrawer: () =>
    set({
      isTransactionDrawerOpen: false,
      selectedTransaction: null,
      draftTransaction: null,
    }),
}));
