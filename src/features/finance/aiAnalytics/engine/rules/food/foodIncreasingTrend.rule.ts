import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { monthlyValuesFor, trailingIncreasingCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import { FOOD_CATEGORY } from "@/features/finance/aiAnalytics/engine/rules/food/foodShareCritical.rule";

const TREND_WINDOW_MONTHS = 3;
// 3 months strictly increasing = 2 consecutive month-over-month increases.
const MIN_INCREASING_RUN = 2;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const monthlyFood = monthlyValuesFor(context.transactions, FOOD_CATEGORY, "expense", TREND_WINDOW_MONTHS, context.now);
  const increasingRun = trailingIncreasingCount(monthlyFood);
  if (increasingRun < MIN_INCREASING_RUN) return [];

  const months = increasingRun + 1;
  return [
    {
      id: "food-increasing-trend",
      key: "foodIncreasingTrend",
      priority: "medium",
      // A trend warning, not a specific behavior to cut — no other rule
      // here carries a savings estimate for "your spending is trending up".
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { months },
      ...ruleMessages("foodIncreasingTrend", {}, { months }),
    },
  ];
}

const rule: FinancialRule = {
  id: "foodIncreasingTrend",
  name: "Food Increasing Trend",
  description: "Fires when Food category spend has increased for 3+ consecutive trailing months.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
