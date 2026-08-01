// Pure selection over Prompt 008's own ForecastEngineResult — zero new
// computation.

import type { ForecastEngineResult } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { ForecastSummarySection } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

export function buildForecastSummarySection(forecastProfile: ForecastEngineResult): ForecastSummarySection {
  const { summary, details, confidence } = forecastProfile;

  return {
    expectedEndOfMonthBalance: summary.expectedEndOfMonthBalance,
    expectedSavings: summary.expectedSavings,
    categoriesLikelyToExceed: details.budgetForecast.categoriesLikelyToExceed,
    categoriesLikelyToRemainUnder: details.budgetForecast.categoriesLikelyToRemainUnder,
    goalsAtRisk: details.goalForecast.filter((g) => g.projectedDelayDays !== null && g.projectedDelayDays > 0).map((g) => g.goal.name),
    cashFlowStabilityScore: details.monthlyForecast.cashFlowStabilityScore,
    confidence,
  };
}
