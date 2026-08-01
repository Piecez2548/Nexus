// Reuses the Rule Engine's own output rather than a parallel alert
// framework — the allowlisted rule keys already cover budget overflow,
// savings decline, cash shortage/negative cash flow, and unusual spending
// growth. On top of that, one genuinely new forward-looking alert this
// engine alone can produce: goalDelay, from this engine's own
// goalForecast[].projectedDelayDays — distinct from the existing
// goalBehindSchedule rule, which only fires *after* a deadline has already
// passed, never as a forward projection.

import type { Recommendation, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { ForecastAlert, ForecastAlertSeverity, ForecastAlertType, GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";

const ALERT_TYPE_BY_RULE_KEY: Record<string, ForecastAlertType> = {
  forecastBudgetOverflow: "budgetOverflow",
  repeatedBudgetOverflow: "budgetOverflow",
  forecastSavingsDecline: "savingsDecline",
  forecastNegativeCashFlow: "cashShortage",
  negativeCashFlow: "cashShortage",
  repeatedNegativeCashFlow: "cashShortage",
  fastestGrowingMerchant: "unusualSpendingGrowth",
  foodIncreasingTrend: "unusualSpendingGrowth",
  shoppingGrowthHigh: "unusualSpendingGrowth",
  expenseSpike: "unusualSpendingGrowth",
};

const SEVERITY_BY_PRIORITY: Record<RecommendationPriority, ForecastAlertSeverity> = {
  critical: "critical",
  high: "warning",
  medium: "info",
  low: "info",
  information: "info",
};

function alertsFromRecommendations(recommendations: Recommendation[]): ForecastAlert[] {
  return recommendations
    .filter((r): r is Recommendation & { key: keyof typeof ALERT_TYPE_BY_RULE_KEY } => r.key in ALERT_TYPE_BY_RULE_KEY)
    .map((r) => ({
      id: `rule-${r.id}`,
      type: ALERT_TYPE_BY_RULE_KEY[r.key],
      severity: SEVERITY_BY_PRIORITY[r.priority],
      message: r.title,
      relatedForecastKey: r.key,
      sourceRecommendationId: r.id,
    }));
}

function goalDelayAlerts(goalForecast: GoalForecastEntry[]): ForecastAlert[] {
  return goalForecast
    .filter((g) => g.projectedDelayDays !== null && g.projectedDelayDays > 0)
    .map((g) => ({
      id: `goal-delay-${g.goal.syncId ?? g.goal.name}`,
      type: "goalDelay" as const,
      severity: "warning" as const,
      message: { key: "aiAnalytics.forecast.alerts.goalDelay", params: { goalName: g.goal.name, days: g.projectedDelayDays! } },
      relatedForecastKey: "goalForecast",
      sourceRecommendationId: null,
    }));
}

export function generateForecastAlerts(recommendations: Recommendation[], goalForecast: GoalForecastEntry[]): ForecastAlert[] {
  return [...alertsFromRecommendations(recommendations), ...goalDelayAlerts(goalForecast)];
}
