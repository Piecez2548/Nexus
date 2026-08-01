import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";

export type { BudgetProgress };

export function useBudgetProgress(): BudgetProgress[] {
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();

  return useMemo(() => {
    return budgets.map((budget) => ({
      budget,
      ...computeBudgetSpend(budget, transactions),
    }));
  }, [transactions, budgets]);
}
