import { create } from "zustand";
import { persist } from "zustand/middleware";

import { learningKey } from "@/features/finance/slipScanner/learning/applyLearning";

// Persists the Smart Learning Engine's local corrections (GS-045): merchant
// mappings, OCR text fixes, and bank naming. Category learning lives in
// categoryLearningStore (GS-043). Plain records so they serialise; all local.
interface LearningState {
  merchantMap: Record<string, string>;
  ocrCorrections: Record<string, string>;
  bankNaming: Record<string, string>;
  learnMerchant: (raw: string, corrected: string) => void;
  learnOcr: (wrong: string, right: string) => void;
  learnBankName: (bankId: string, name: string) => void;
  reset: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      merchantMap: {},
      ocrCorrections: {},
      bankNaming: {},
      learnMerchant: (raw, corrected) =>
        set((state) => ({ merchantMap: { ...state.merchantMap, [learningKey(raw)]: corrected } })),
      learnOcr: (wrong, right) =>
        set((state) => ({ ocrCorrections: { ...state.ocrCorrections, [wrong]: right } })),
      learnBankName: (bankId, name) => set((state) => ({ bankNaming: { ...state.bankNaming, [bankId]: name } })),
      reset: () => set({ merchantMap: {}, ocrCorrections: {}, bankNaming: {} }),
    }),
    { name: "nexus-slip-learning" },
  ),
);
