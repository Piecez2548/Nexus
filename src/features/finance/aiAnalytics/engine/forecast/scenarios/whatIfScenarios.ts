// What-If Scenarios — genuinely new (confirmed zero existing code via a
// full-codebase grep), and deliberately NOT part of ForecastEngineResult:
// each scenario is parameterized by user input, computed on-demand, the
// same way useCategoryDetail computes on-demand rather than as part of the
// main batch result. Three of the spec's four example scenarios are pure
// arithmetic on already-computed data; the fourth ("reduce coffee
// purchases by half -> estimate financial score improvement") needs a real
// analyzer re-run and lives in scenarioPipelineRunner.ts (WP12), which also
// completes simulateScenario()'s dispatcher.

import { estimateGoalForecast } from "@/features/finance/aiAnalytics/engine/forecast/estimators/goalForecastEstimator";
import { AVERAGE_DAYS_PER_MONTH, addDays } from "@/features/finance/aiAnalytics/engine/forecast/calculators/mathUtils";
import { applySpendingReduction, runScenarioPipeline } from "@/features/finance/aiAnalytics/engine/forecast/scenarios/scenarioPipelineRunner";
import { toLocalDateString } from "@/utils/localDate";
import { FOOD_CATEGORY } from "@/features/finance/aiAnalytics/engine/rules/food/foodShareCritical.rule";
import { BEHAVIOR_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";
import type { WhatIfResult, WhatIfScenarioContext, WhatIfScenarioInput } from "@/features/finance/aiAnalytics/engine/forecast/types";

const MONTHS_PER_YEAR = 12;

export function simulateReduceFoodSpending(spendingAnalysis: SpendingAnalysisResult, reductionPercent: number): Extract<WhatIfResult, { type: "reduceFoodSpending" }> {
  const food = spendingAnalysis.topCategories.find((c) => c.category === FOOD_CATEGORY);
  const currentMonthlySpend = food?.amount ?? 0;
  const estimatedMonthlySavings = currentMonthlySpend * (reductionPercent / 100);

  return { type: "reduceFoodSpending", estimatedMonthlySavings, estimatedYearlySavings: estimatedMonthlySavings * MONTHS_PER_YEAR };
}

function daysToComplete(remainingAmount: number, dailyPace: number): number | null {
  return dailyPace > 0 ? Math.ceil(remainingAmount / dailyPace) : null;
}

export function simulateIncreaseGoalSavings(
  goal: Goal,
  goalMilestoneEvents: GoalMilestoneEvent[],
  additionalMonthlyAmount: number,
  now = new Date()
): Extract<WhatIfResult, { type: "increaseGoalSavings" }> {
  const isComplete = goal.currentAmount >= goal.targetAmount;
  const remainingAmount = goal.targetAmount - goal.currentAmount;

  // Reuses the real estimator's own pace derivation rather than
  // recomputing it — only the pace itself is borrowed, the resulting date
  // is recomputed here with the boosted pace.
  const baseline = estimateGoalForecast(goal, goalMilestoneEvents, now);
  const basePaceMonthly = baseline.monthlyProgressAmount ?? 0;
  const newPaceMonthly = basePaceMonthly + additionalMonthlyAmount;

  const newDays = isComplete ? null : daysToComplete(remainingAmount, newPaceMonthly / AVERAGE_DAYS_PER_MONTH);
  // Working in days-to-complete rather than round-tripping through
  // baseline.expectedCompletionDate's date STRING avoids re-parsing a
  // "YYYY-MM-DD" string as UTC midnight, which can drift a day in any
  // non-UTC timezone (the same gotcha isDateWithinRange's own comment
  // warns about).
  const baselineDays = isComplete ? null : daysToComplete(remainingAmount, basePaceMonthly / AVERAGE_DAYS_PER_MONTH);

  const estimatedCompletionDate = newDays !== null ? toLocalDateString(addDays(now, newDays)) : null;
  const monthsSaved = newDays !== null && baselineDays !== null ? (baselineDays - newDays) / AVERAGE_DAYS_PER_MONTH : null;

  return { type: "increaseGoalSavings", estimatedCompletionDate, monthsSaved };
}

export function simulateCancelSubscriptions(subscriptions: SubscriptionEntry[], normalizedTitles: string[]): Extract<WhatIfResult, { type: "cancelSubscriptions" }> {
  const matched = subscriptions.filter((s) => normalizedTitles.includes(s.normalizedTitle));
  const estimatedMonthlySavings = matched.reduce((sum, s) => sum + s.averageAmount, 0);

  return { type: "cancelSubscriptions", estimatedMonthlySavings, estimatedYearlySavings: estimatedMonthlySavings * MONTHS_PER_YEAR };
}

// The one scenario that needs a real analyzer re-run (see
// scenarioPipelineRunner.ts's header comment for why) — computes the real
// baseline score, then the real score after coffee-matching transactions
// are scaled down, and reports the difference. Never a fabricated "score
// per baht" shortcut formula.
export function simulateReduceCoffeeSpending(
  context: Pick<WhatIfScenarioContext, "transactions" | "budgets" | "recipientProfiles" | "goalProgress" | "now">,
  reductionPercent: number
): Extract<WhatIfResult, { type: "reduceCoffeeSpending" }> {
  const { transactions, budgets, recipientProfiles, goalProgress, now } = context;

  const baselineScore = runScenarioPipeline({ transactions, budgets, recipientProfiles, goalProgress, now });
  const reducedTransactions = applySpendingReduction(transactions, BEHAVIOR_KEYWORDS.coffee, recipientProfiles, reductionPercent);
  const projectedScore = runScenarioPipeline({ transactions: reducedTransactions, budgets, recipientProfiles, goalProgress, now });

  const estimatedScoreImprovement = baselineScore !== null && projectedScore !== null ? projectedScore - baselineScore : null;

  return { type: "reduceCoffeeSpending", baselineScore, projectedScore, estimatedScoreImprovement };
}

// Completes the discriminated union — every WhatIfScenarioInput variant
// dispatches to its own scenario function above. Not part of
// ForecastEngineResult; called on-demand by a future hook/UI with
// whatever context it needs assembled at call time.
export function simulateScenario(input: WhatIfScenarioInput, context: WhatIfScenarioContext): WhatIfResult {
  switch (input.type) {
    case "reduceFoodSpending":
      return simulateReduceFoodSpending(context.spendingAnalysis, input.reductionPercent);
    case "increaseGoalSavings": {
      const goal = context.goals.find((g) => g.syncId === input.goalSyncId);
      if (!goal) return { type: "increaseGoalSavings", estimatedCompletionDate: null, monthsSaved: null };
      return simulateIncreaseGoalSavings(goal, context.goalMilestoneEvents, input.additionalMonthlyAmount, context.now);
    }
    case "cancelSubscriptions":
      return simulateCancelSubscriptions(context.subscriptions, input.normalizedTitles);
    case "reduceCoffeeSpending":
      return simulateReduceCoffeeSpending(context, input.reductionPercent);
  }
}
