// Analytics domain model surface for Insight — aliases the types
// insights.ts already owns and computes. See insights.ts for
// generateInsights(); nothing here recomputes it.
//
// No "Confidence" field is added: unlike Recommendation, AiInsight carries
// no per-item confidence signal in this engine, and fabricating a constant
// would misrepresent it as a real measurement.

import type { InsightCategory } from "@/features/finance/aiAnalytics/models/enums";
import type { AiInsight, AiInsightKey } from "@/features/finance/aiAnalytics/engine/analyzers/insights";

export type { AiInsight as Insight, AiInsightKey } from "@/features/finance/aiAnalytics/engine/analyzers/insights";

// AiInsight has no stored category — this classifies each key into the
// domain it reports on, so consumers can group/filter insights without
// insights.ts itself needing to track a redundant field.
const INSIGHT_KEY_CATEGORY: Record<AiInsightKey, InsightCategory> = {
  highestSpendingCategory: "spending",
  fastestGrowingCategory: "spending",
  budgetExceeded: "budget",
  spendingTrend: "spending",
  savingsTrend: "cashFlow",
  cashFlowSummary: "cashFlow",
  largestTransaction: "spending",
  highestSpendingDay: "spending",
  mostExpensiveWeek: "spending",
  upcomingBudgetRisk: "forecast",
  weekendOverspending: "behavior",
};

export function categoryForInsight(insight: AiInsight): InsightCategory {
  return INSIGHT_KEY_CATEGORY[insight.key];
}
