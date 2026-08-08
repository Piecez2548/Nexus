import { create } from "zustand";
import { persist } from "zustand/middleware";

import { categoryLearningKey, type SlipCategory } from "@/features/finance/slipScanner/ai/transactionCategorizer";

// Persists user category corrections (GS-043 / GS-045 learning), keyed by the
// normalised merchant/title. All local — no cloud AI. `corrections` is a plain
// record so it serialises; the hook exposes it as a Map to the categorizer.
interface CategoryLearningState {
  corrections: Record<string, SlipCategory>;
  learn: (text: string, category: SlipCategory) => void;
  asMap: () => Map<string, SlipCategory>;
  reset: () => void;
}

export const useCategoryLearningStore = create<CategoryLearningState>()(
  persist(
    (set, get) => ({
      corrections: {},
      learn: (text, category) =>
        set((state) => ({ corrections: { ...state.corrections, [categoryLearningKey(text)]: category } })),
      asMap: () => new Map(Object.entries(get().corrections)),
      reset: () => set({ corrections: {} }),
    }),
    { name: "nexus-category-learning" },
  ),
);
