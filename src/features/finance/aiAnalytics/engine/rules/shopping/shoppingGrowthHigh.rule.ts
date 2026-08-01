import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Same v1 simplification as the Food rules — categories are free-text, so
// this matches the app's default onboarding category name literally.
const SHOPPING_CATEGORY = "Shopping";
const GROWTH_THRESHOLD_PERCENT = 30;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const entry = context.spendingAnalysis.categoryComparison.find((c) => c.category === SHOPPING_CATEGORY);
  if (!entry || entry.changePercent === null || entry.changePercent <= GROWTH_THRESHOLD_PERCENT) return [];

  const percent = Math.round(entry.changePercent);
  return [
    {
      id: "shopping-growth-high",
      key: "shoppingGrowthHigh",
      priority: "medium",
      // A trend flag, not a specific purchase to cut.
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { percent },
      ...ruleMessages("shoppingGrowthHigh", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "shoppingGrowthHigh",
  name: "Shopping Growth High",
  description: "Fires when Shopping category spend is up 30%+ vs. last month.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
