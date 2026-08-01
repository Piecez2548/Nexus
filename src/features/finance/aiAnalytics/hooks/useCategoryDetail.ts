import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { analyzeCategoryDetail } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";
import type { CategoryDetailResult } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

// Mirrors useFinancialAnalysis.ts's store-reading pattern, but stays
// synchronous (no engine/Promise seam) — category detail is a pure
// local computation over data the page has already loaded, not a
// candidate for a future remote-AI swap.
export function useCategoryDetail(category: string | null, now?: Date): CategoryDetailResult | null {
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { profiles: recipientProfiles } = useRecipientProfileStore();

  const resolvedNow = useMemo(() => now ?? new Date(), [now]);

  return useMemo(() => {
    if (category === null) return null;
    return analyzeCategoryDetail(transactions, recipientProfiles, budgets, category, resolvedNow);
  }, [category, transactions, recipientProfiles, budgets, resolvedNow]);
}
