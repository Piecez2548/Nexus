import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, confidenceForSampleSize, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const COFFEE_VISIT_THRESHOLD = 10;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const coffeeFlag = context.behaviorAnalysis.flags.find((f) => f.key === "coffee");
  if (!coffeeFlag || coffeeFlag.transactionCount <= COFFEE_VISIT_THRESHOLD) return [];

  const estimatedMonthlySavings = Math.round(coffeeFlag.totalAmount * REDUCTION_ASSUMPTION);
  return [
    {
      id: "reduce-coffee-visits",
      key: "reduceCoffeeVisits",
      priority: priorityForSavings(estimatedMonthlySavings),
      estimatedMonthlySavings,
      confidence: confidenceForSampleSize(coffeeFlag.transactionCount),
      params: { count: coffeeFlag.transactionCount },
      ...ruleMessages("reduceCoffeeVisits", {}, { count: coffeeFlag.transactionCount, threshold: COFFEE_VISIT_THRESHOLD }),
    },
  ];
}

const rule: FinancialRule = {
  id: "reduceCoffeeVisits",
  name: "Reduce Coffee Visits",
  description: "Fires when coffee purchases exceed 10 in the trailing 3-month window.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
