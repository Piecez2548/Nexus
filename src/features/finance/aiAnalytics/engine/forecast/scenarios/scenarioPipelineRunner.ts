// The one what-if scenario ("reduce coffee purchases by half -> estimate
// financial score improvement") that can't be arithmetic-only without
// fabricating a "score impact" formula. Re-runs the real analyzer chain
// (identical functions localStatisticalEngine.ts's own runAnalysis() uses)
// on a transformed transaction list, so the estimate is a genuine
// recomputation, not an approximation. goals/budgets are structurally
// unchanged by a spending-reduction scenario, so goalProgress passes
// through unmodified rather than being recomputed.

import { analyzeCashFlow } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import { analyzeBudgets } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import { analyzeSpending } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import { analyzeBehavior, matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { computeTransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import { computeFinancialHealthScore } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/computeFinancialHealthScore";
import { computeBudgetSpend } from "@/features/finance/utils/budgetStatus";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { Budget, RecipientProfile, Transaction } from "@/features/finance/types";

export interface ScenarioPipelineInput {
  transactions: Transaction[];
  budgets: Budget[];
  recipientProfiles: RecipientProfile[];
  goalProgress: GoalProgressEntry[];
  now: Date;
}

// Real analyzers, real recomputation — returns FinancialHealthScoreResult's
// own overallScore (null exactly when it judges the profile insufficient
// data, same nullability as everywhere else in this app).
export function runScenarioPipeline(input: ScenarioPipelineInput): number | null {
  const { transactions, budgets, recipientProfiles, goalProgress, now } = input;

  const budgetProgress = budgets.map((budget) => ({ budget, ...computeBudgetSpend(budget, transactions, now) }));
  const budgetAnalysis = analyzeBudgets(budgetProgress);
  const cashFlowAnalysis = analyzeCashFlow(transactions, now);
  const spendingAnalysis = analyzeSpending(transactions, cashFlowAnalysis.monthlyTrend, now);
  const behaviorAnalysis = analyzeBehavior(transactions, recipientProfiles, budgets, spendingAnalysis.weekdayAnalysis, now);
  const transactionStatistics = computeTransactionStatistics(transactions, spendingAnalysis, cashFlowAnalysis, now);

  const scoreContext: ScoreContext = { cashFlowAnalysis, budgetAnalysis, spendingAnalysis, transactionStatistics, behaviorAnalysis, goalProgress, transactions, budgets, now };
  return computeFinancialHealthScore(scoreContext).overallScore;
}

// Scales down every expense transaction matching `keywords` by
// reductionPercent — the transformation a what-if "reduce X spending"
// scenario re-runs the pipeline against.
export function applySpendingReduction(transactions: Transaction[], keywords: readonly string[], recipientProfiles: RecipientProfile[], reductionPercent: number): Transaction[] {
  const aliasByKey = recipientAliasLookup(recipientProfiles);
  return transactions.map((t) => (t.type === "expense" && matchesKeywordFlag(t, keywords, aliasByKey) ? { ...t, amount: t.amount * (1 - reductionPercent / 100) } : t));
}
