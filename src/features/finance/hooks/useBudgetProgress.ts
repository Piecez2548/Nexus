import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { Budget } from "@/features/finance/types";

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  status: "ok" | "near" | "over";
}

const NEAR_LIMIT_PERCENT = 80;

export function useBudgetProgress(): BudgetProgress[] {
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();

  return useMemo(() => {
    return budgets.map((budget) => {
      const range = getCurrentPeriodRange(budget.period);

      const spent = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.category === budget.category &&
            isDateWithinRange(t.date, range)
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const status: BudgetProgress["status"] =
        percentage >= 100 ? "over" : percentage >= NEAR_LIMIT_PERCENT ? "near" : "ok";

      return {
        budget,
        spent,
        remaining: budget.amount - spent,
        percentage: Math.min(percentage, 100),
        status,
      };
    });
  }, [transactions, budgets]);
}
