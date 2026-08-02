// Generalizes engine/analyzers/forecast.ts's existing monthly-only budget
// overflow projection (computeBudgetOverflowRisk) to every BudgetPeriod,
// via the same getCurrentPeriodRange()-driven day-elapsed/total-days math
// (reused, not duplicated, from predictors/periodForecastCalculator.ts).

import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { daysBetween } from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
import { calculateForecastConfidence } from "@/features/finance/aiAnalytics/engine/forecast/calculators/forecastConfidenceCalculator";
import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { BudgetForecastEntry, BudgetForecastResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

function estimateEntry(entry: BudgetProgress, now: Date): BudgetForecastEntry {
  const range = getCurrentPeriodRange(entry.budget.period, now);
  const totalDays = daysBetween(range.start, range.end);
  const daysElapsed = clamp(daysBetween(range.start, now) + 1, 1, totalDays);

  const projectedSpend = (entry.spent / daysElapsed) * totalDays;
  const projectedPercentage = (projectedSpend / entry.budget.amount) * 100;

  return {
    category: entry.budget.category,
    period: entry.budget.period,
    budgetAmount: entry.budget.amount,
    spentSoFar: entry.spent,
    projectedSpend,
    projectedPercentage,
    completionPercentage: entry.percentage,
    estimatedOverflowAmount: Math.max(0, projectedSpend - entry.budget.amount),
    classification: projectedPercentage >= 100 ? "likelyExceed" : "likelyRemainUnder",
  };
}

export function estimateBudgetForecast(budgetProgress: BudgetProgress[], monthsOfHistory: number, insufficientData: boolean, now = new Date()): BudgetForecastResult {
  // Excludes budgets already "over" (a present-tense fact, not a
  // forecast) and amount<=0 (division by zero) — same exclusions
  // forecast.ts's own computeBudgetOverflowRisk already applies.
  const entries = budgetProgress.filter((e) => e.status !== "over" && e.budget.amount > 0).map((e) => estimateEntry(e, now));

  return {
    entries,
    categoriesLikelyToExceed: entries.filter((e) => e.classification === "likelyExceed").map((e) => e.category),
    categoriesLikelyToRemainUnder: entries.filter((e) => e.classification === "likelyRemainUnder").map((e) => e.category),
    // No single stability series applies across potentially many
    // differently-categorized budgets, so stabilityScore is null here —
    // calculateForecastConfidence already handles that gracefully.
    confidence: calculateForecastConfidence(monthsOfHistory, null, insufficientData),
  };
}
