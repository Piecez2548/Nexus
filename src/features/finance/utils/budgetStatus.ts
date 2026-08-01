import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { Budget, Transaction } from "@/features/finance/types";

export const NEAR_LIMIT_PERCENT = 80;

export interface BudgetSpendResult {
  spent: number;
  remaining: number;
  // Clamped to 100 — for display (progress bars). Callers that need the
  // true utilization past 100% (e.g. the health score's Budget Usage
  // sub-score) must compute spent/budget.amount themselves.
  percentage: number;
  status: "ok" | "near" | "over";
}

// The shape shared by useBudgetProgress.ts (its React-facing name for this)
// and the AI Analytics engine's analyzers, which consume the same
// once-computed array without importing anything from the hooks layer.
export interface BudgetProgress extends BudgetSpendResult {
  budget: Budget;
}

export function computeBudgetSpend(budget: Budget, transactions: Transaction[], now = new Date()): BudgetSpendResult {
  const range = getCurrentPeriodRange(budget.period, now);

  const spent = transactions
    .filter((t) => t.type === "expense" && t.category === budget.category && isDateWithinRange(t.date, range))
    .reduce((sum, t) => sum + t.amount, 0);

  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const status: BudgetSpendResult["status"] =
    percentage >= 100 ? "over" : percentage >= NEAR_LIMIT_PERCENT ? "near" : "ok";

  return {
    spent,
    remaining: budget.amount - spent,
    percentage: Math.min(percentage, 100),
    status,
  };
}
