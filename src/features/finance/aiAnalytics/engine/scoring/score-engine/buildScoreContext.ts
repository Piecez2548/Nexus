// Re-runs the subset of the analyzer pipeline localStatisticalEngine.ts
// already calls (cashFlow/budgets/spending/behavior/statistics/goals), at
// an arbitrary `now` — no new statistical logic, just a smaller
// re-invocation of the same pure functions parameterized by a different
// point in time. Used only by scoreTrend.ts for historical comparison; the
// "current" score wired into FinancialAnalysisResult reuses
// localStatisticalEngine.ts's already-computed locals directly and never
// calls this (would be redundant recomputation).

import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";
import { analyzeCashFlow } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import { analyzeBudgets } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import { analyzeSpending } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import { analyzeBehavior } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { computeTransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import { analyzeGoals } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { Budget, Goal, GoalMilestoneEvent, RecipientProfile, Transaction } from "@/features/finance/types";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";

// Only what buildScoreContext actually reads — deliberately not
// FinancialAnalysisInput (which also carries `categories`/`now`, unused by
// any analyzer this function calls). Callers supply `now` separately
// (often several times, once per trend point) against the same unchanging
// raw data.
export interface ScoreContextInput {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recipientProfiles: RecipientProfile[];
  goalMilestoneEvents: GoalMilestoneEvent[];
}

export function buildScoreContext(input: ScoreContextInput, now: Date): ScoreContext {
  const { transactions, budgets, goals, recipientProfiles, goalMilestoneEvents } = input;

  // Mirrors localStatisticalEngine.ts's own budgetProgress construction —
  // every consumer of budget status derives it the same way.
  const budgetProgress: BudgetProgress[] = budgets.map((budget) => ({ budget, ...computeBudgetSpend(budget, transactions, now) }));

  const cashFlowAnalysis = analyzeCashFlow(transactions, now);
  const budgetAnalysis = analyzeBudgets(budgetProgress);
  const spendingAnalysis = analyzeSpending(transactions, cashFlowAnalysis.monthlyTrend, now);
  const behaviorAnalysis = analyzeBehavior(transactions, recipientProfiles, budgets, spendingAnalysis.weekdayAnalysis, now);
  const transactionStatistics = computeTransactionStatistics(transactions, spendingAnalysis, cashFlowAnalysis, now);
  const goalProgress = analyzeGoals(goals, goalMilestoneEvents, now);

  return { cashFlowAnalysis, budgetAnalysis, spendingAnalysis, transactionStatistics, behaviorAnalysis, goalProgress, transactions, budgets, now };
}
