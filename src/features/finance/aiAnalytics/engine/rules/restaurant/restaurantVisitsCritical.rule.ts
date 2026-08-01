import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

export const RESTAURANT_VISITS_CRITICAL_THRESHOLD = 30;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const flag = context.behaviorAnalysis.flags.find((f) => f.key === "eatingOut");
  if (!flag || flag.transactionCount <= RESTAURANT_VISITS_CRITICAL_THRESHOLD) return [];

  const estimatedMonthlySavings = Math.round(flag.totalAmount * REDUCTION_ASSUMPTION);
  return [
    {
      id: "restaurant-visits-critical",
      key: "restaurantVisitsCritical",
      priority: "critical",
      estimatedMonthlySavings,
      confidence: "high",
      params: { count: flag.transactionCount },
      ...ruleMessages("restaurantVisitsCritical", {}, { count: flag.transactionCount, threshold: RESTAURANT_VISITS_CRITICAL_THRESHOLD }),
    },
  ];
}

const rule: FinancialRule = {
  id: "restaurantVisitsCritical",
  name: "Restaurant Visits Critical",
  description: "Fires when eatingOut visits exceed 30 in the trailing 3-month window — a more severe escalation of reduceRestaurantVisits' 20-visit threshold.",
  category: "expense",
  defaultPriority: "critical",
  enabled: true,
  evaluate,
};

export default rule;
