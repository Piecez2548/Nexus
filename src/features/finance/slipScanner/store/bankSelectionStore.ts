import { create } from "zustand";
import { persist } from "zustand/middleware";

// Remembers the user's pre-scan bank selection across sessions (the
// "Remember previous selection" requirement). `chosen` distinguishes "never
// picked → default to all banks" from "explicitly deselected everything", which
// the hook needs to decide the effective selection. The store is pure
// persistence — all selection logic lives in the hook / bankSelection.ts.
interface BankSelectionState {
  selectedBankIds: string[];
  chosen: boolean;
  setSelectedBankIds: (ids: string[]) => void;
  reset: () => void;
}

export const useBankSelectionStore = create<BankSelectionState>()(
  persist(
    (set) => ({
      selectedBankIds: [],
      chosen: false,
      setSelectedBankIds: (selectedBankIds) => set({ selectedBankIds, chosen: true }),
      reset: () => set({ selectedBankIds: [], chosen: false }),
    }),
    { name: "nexus-bank-selection" },
  ),
);
