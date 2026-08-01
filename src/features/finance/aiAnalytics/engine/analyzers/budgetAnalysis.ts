import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";

export interface BudgetAnalysisEntry extends BudgetProgress {
  // Only set for over-budget entries — a lower monthly cap that would have
  // kept this budget exactly at 100% utilization for the period observed.
  suggestedMonthlyCap: number | null;
  // Only set for over-budget entries — how much less would have been spent
  // had this budget stayed within its cap.
  potentialMonthlySavings: number | null;
}

export interface BudgetAnalysisResult {
  entries: BudgetAnalysisEntry[];
  overCount: number;
  nearCount: number;
  okCount: number;
}

export function analyzeBudgets(budgetProgress: BudgetProgress[]): BudgetAnalysisResult {
  const entries: BudgetAnalysisEntry[] = budgetProgress.map((entry) => {
    if (entry.status !== "over") {
      return { ...entry, suggestedMonthlyCap: null, potentialMonthlySavings: null };
    }

    return {
      ...entry,
      suggestedMonthlyCap: entry.budget.amount,
      potentialMonthlySavings: entry.spent - entry.budget.amount,
    };
  });

  return {
    entries,
    overCount: entries.filter((e) => e.status === "over").length,
    nearCount: entries.filter((e) => e.status === "near").length,
    okCount: entries.filter((e) => e.status === "ok").length,
  };
}
