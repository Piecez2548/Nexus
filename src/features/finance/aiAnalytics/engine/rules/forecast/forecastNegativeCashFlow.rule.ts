import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const trend = context.forecast.futureCashFlowTrend;
  if (trend.basis !== "linearProjection" || trend.projectedMonthlyNet === null || trend.projectedMonthlyNet >= 0) return [];

  const deficit = Math.round(Math.abs(trend.projectedMonthlyNet));
  return [
    {
      id: "forecast-negative-cash-flow",
      key: "forecastNegativeCashFlow",
      priority: "high",
      estimatedMonthlySavings: deficit,
      confidence: "medium",
      params: { deficit },
      ...ruleMessages("forecastNegativeCashFlow", {}, { deficit }),
    },
  ];
}

const rule: FinancialRule = {
  id: "forecastNegativeCashFlow",
  name: "Forecast Negative Cash Flow",
  description: "Fires when forecast.futureCashFlowTrend projects a negative average monthly net.",
  category: "forecast",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
