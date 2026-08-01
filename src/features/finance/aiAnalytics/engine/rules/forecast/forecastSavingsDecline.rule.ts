import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const DECLINE_THRESHOLD_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const monthlyTrend = context.cashFlowAnalysis.monthlyTrend;
  // The last entry is the current, still-in-progress month — compare
  // against the last fully-closed one instead.
  if (monthlyTrend.length < 2) return [];

  const previousSaving = monthlyTrend[monthlyTrend.length - 2].saving;
  if (previousSaving <= 0) return [];

  const expectedSavings = context.forecast.expectedSavings;
  if (expectedSavings >= previousSaving) return [];

  const percent = Math.round(((previousSaving - expectedSavings) / previousSaving) * 100);
  if (percent < DECLINE_THRESHOLD_PERCENT) return [];

  return [
    {
      id: "forecast-savings-decline",
      key: "forecastSavingsDecline",
      priority: "medium",
      estimatedMonthlySavings: Math.round(previousSaving - expectedSavings),
      confidence: "medium",
      params: { percent, expectedSavings: Math.round(expectedSavings), previousSaving: Math.round(previousSaving) },
      ...ruleMessages("forecastSavingsDecline", {}, { percent, expectedSavings: Math.round(expectedSavings), previousSaving: Math.round(previousSaving) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "forecastSavingsDecline",
  name: "Forecast Savings Decline",
  description: "Fires when this month's expected savings are projected 20%+ below last month's actual saving.",
  category: "forecast",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
