import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, confidenceForSampleSize, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { RESTAURANT_VISITS_CRITICAL_THRESHOLD } from "@/features/finance/aiAnalytics/engine/rules/restaurant/restaurantVisitsCritical.rule";

const RESTAURANT_VISIT_THRESHOLD = 20;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const restaurantFlag = context.behaviorAnalysis.flags.find((f) => f.key === "eatingOut");
  if (!restaurantFlag || restaurantFlag.transactionCount <= RESTAURANT_VISIT_THRESHOLD) return [];
  // Above the critical threshold, restaurantVisitsCritical takes over with
  // more urgent framing — only imports the threshold constant, not the
  // rule itself.
  if (restaurantFlag.transactionCount > RESTAURANT_VISITS_CRITICAL_THRESHOLD) return [];

  const estimatedMonthlySavings = Math.round(restaurantFlag.totalAmount * REDUCTION_ASSUMPTION);
  return [
    {
      id: "reduce-restaurant-visits",
      key: "reduceRestaurantVisits",
      priority: priorityForSavings(estimatedMonthlySavings),
      estimatedMonthlySavings,
      confidence: confidenceForSampleSize(restaurantFlag.transactionCount),
      params: { count: restaurantFlag.transactionCount },
      ...ruleMessages("reduceRestaurantVisits", {}, { count: restaurantFlag.transactionCount, threshold: RESTAURANT_VISIT_THRESHOLD }),
    },
  ];
}

const rule: FinancialRule = {
  id: "reduceRestaurantVisits",
  name: "Reduce Restaurant Visits",
  description: "Fires when eatingOut visits exceed 20 in the trailing 3-month window.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
