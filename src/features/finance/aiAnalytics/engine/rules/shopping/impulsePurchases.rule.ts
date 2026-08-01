import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const MIN_IMPULSE_COUNT = 2;
// Same heuristic every other non-budget-based rule in this registry uses
// for "how much of this is realistically avoidable".
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const purchases = context.behaviorAnalysis.impulsePurchases;
  if (purchases.length < MIN_IMPULSE_COUNT) return [];

  const total = purchases.reduce((sum, p) => sum + p.amount, 0);
  const estimatedMonthlySavings = Math.round(total * REDUCTION_ASSUMPTION);

  return [
    {
      id: "impulse-purchases",
      key: "impulsePurchases",
      priority: "medium",
      estimatedMonthlySavings,
      confidence: "medium",
      params: { count: purchases.length, amount: Math.round(total) },
      ...ruleMessages("impulsePurchases", {}, { count: purchases.length, amount: Math.round(total) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "impulsePurchases",
  name: "Impulse Purchases",
  description: "Surfaces behaviorAnalysis.impulsePurchases as an actual recommendation once 2+ are detected.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
