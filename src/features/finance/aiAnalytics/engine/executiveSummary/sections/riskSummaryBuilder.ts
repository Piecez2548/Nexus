// forecastProfile.alerts mapped to a RiskCategory per entry, severity-
// sorted. The spec's 5-bullet risk list needs one split beyond
// ForecastAlertType's 5 values: "unusualSpendingGrowth" alerts split by
// their underlying rule key (relatedForecastKey, = the rule's own .key) —
// category-trend rules (foodIncreasingTrend/shoppingGrowthHigh) vs
// merchant/transaction-level rules (fastestGrowingMerchant/expenseSpike).

import type { ForecastAlert, ForecastAlertSeverity, ForecastAlertType } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { RiskCategory, RiskEntry, RiskSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

const UNUSUAL_SPENDING_CATEGORY_RULE_KEYS = new Set(["foodIncreasingTrend", "shoppingGrowthHigh"]);

const RISK_CATEGORY_BY_ALERT_TYPE: Partial<Record<ForecastAlertType, RiskCategory>> = {
  budgetOverflow: "budgetOverflow",
  savingsDecline: "savingsDecline",
  cashShortage: "cashShortage",
  goalDelay: "goalDelay",
};

const SEVERITY_RANK: Record<ForecastAlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

function riskCategoryFor(alert: ForecastAlert): RiskCategory {
  if (alert.type === "unusualSpendingGrowth") {
    return UNUSUAL_SPENDING_CATEGORY_RULE_KEYS.has(alert.relatedForecastKey) ? "highSpendingCategories" : "unusualSpendingBehavior";
  }
  return RISK_CATEGORY_BY_ALERT_TYPE[alert.type]!;
}

export function buildRiskSummary(alerts: ForecastAlert[]): RiskSummary {
  const entries: RiskEntry[] = alerts
    .map((alert) => ({ category: riskCategoryFor(alert), severity: alert.severity, message: alert.message, sourceAlertId: alert.id }))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return { entries };
}
