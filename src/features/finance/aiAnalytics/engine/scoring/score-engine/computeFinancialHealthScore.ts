// Orchestrator — runs all 7 calculators, weights + renormalizes over the
// non-null ones (a category with nothing to score, e.g. no budgets/goals
// yet, doesn't cap the achievable overall score), grades, and aggregates
// every category's explanation into the 5 overall output buckets.

import { calculateSavingRateScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/savingRateScore";
import { calculateBudgetDisciplineScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/budgetDisciplineScore";
import { calculateExpenseControlScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/expenseControlScore";
import { calculateCashFlowScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/cashFlowScore";
import { calculateIncomeStabilityScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/incomeStabilityScore";
import { calculateBehaviorScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/behaviorScore";
import { calculateGoalProgressScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/goalProgressScore";
import { aggregateExplanations } from "@/features/finance/aiAnalytics/engine/scoring/explanations/aggregateExplanations";
import { mergeScoringConfig, gradeForScore, type ScoringConfig } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { CategoryScoreResult, FinancialHealthScoreResult, ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";

export function computeFinancialHealthScore(context: ScoreContext, overrides?: Partial<ScoringConfig>): FinancialHealthScoreResult {
  const config = mergeScoringConfig(overrides);
  const { weights, thresholds } = config;

  const categoryScores: CategoryScoreResult[] = [
    calculateSavingRateScore(context, weights.savingRate, thresholds.savingRate),
    calculateBudgetDisciplineScore(context, weights.budgetDiscipline, thresholds.budgetDiscipline),
    calculateExpenseControlScore(context, weights.expenseControl, thresholds.expenseControl),
    calculateCashFlowScore(context, weights.cashFlow, thresholds.cashFlow),
    calculateIncomeStabilityScore(context, weights.incomeStability, thresholds.incomeStability),
    calculateBehaviorScore(context, weights.behavior, thresholds.behavior),
    calculateGoalProgressScore(context, weights.goalProgress, thresholds.goalProgress),
  ];

  const scored = categoryScores.filter((c): c is CategoryScoreResult & { score: number } => c.score !== null);
  const insufficientData = scored.length === 0;

  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = insufficientData || totalWeight === 0 ? null : scored.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight;

  const gradeBand = overallScore === null ? null : gradeForScore(overallScore, config.gradeTable);
  const explanations = aggregateExplanations(categoryScores);

  return {
    overallScore,
    grade: gradeBand?.grade ?? null,
    status: gradeBand?.status ?? null,
    insufficientData,
    categoryScores,
    ...explanations,
  };
}
