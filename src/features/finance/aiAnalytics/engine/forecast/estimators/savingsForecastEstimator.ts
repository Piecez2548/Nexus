// A thin synthesis, not new computation: expectedMonthlySavings is the
// already-computed MonthlyForecast.expectedSavings (never recomputed);
// best/worst case are the real historical extremes from the trailing
// cashFlowAnalysis.monthlyTrend window (not a modeled range).

import { calculateForecastConfidence } from "@/features/finance/aiAnalytics/engine/forecast/calculators/forecastConfidenceCalculator";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { MonthlyForecast, SavingsForecastGoalEntry, SavingsForecastResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

const MIN_ACTIVE_MONTHS_FOR_RANGE = 2;

export function estimateSavingsForecast(
  monthlyForecast: MonthlyForecast,
  monthlyTrend: CashFlowMonthPoint[],
  goalProgress: GoalProgressEntry[],
  monthsOfHistory: number,
  insufficientData: boolean
): SavingsForecastResult {
  const expectedMonthlySavings = monthlyForecast.expectedSavings;
  const savingRatePercent = monthlyForecast.expectedIncome > 0 ? (expectedMonthlySavings / monthlyForecast.expectedIncome) * 100 : null;

  const activeNetValues = monthlyTrend.filter((m) => m.income !== 0 || m.expense !== 0).map((m) => m.netCashFlow);
  const hasRange = activeNetValues.length >= MIN_ACTIVE_MONTHS_FOR_RANGE;
  const bestCaseMonthlySavings = hasRange ? Math.max(...activeNetValues) : null;
  const worstCaseMonthlySavings = hasRange ? Math.min(...activeNetValues) : null;

  const goalTimelines: SavingsForecastGoalEntry[] = goalProgress
    .filter((g) => !g.isComplete)
    .map((g) => ({
      goalName: g.goal.name,
      monthsToReachAtCurrentPace: expectedMonthlySavings > 0 ? (g.goal.targetAmount - g.goal.currentAmount) / expectedMonthlySavings : null,
    }));

  return {
    expectedMonthlySavings,
    savingRatePercent,
    bestCaseMonthlySavings,
    worstCaseMonthlySavings,
    goalTimelines,
    confidence: calculateForecastConfidence(monthsOfHistory, monthlyForecast.cashFlowStabilityScore, insufficientData),
  };
}
