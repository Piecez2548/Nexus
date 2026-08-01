import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Matches the app's default onboarding category name — v1 simplification,
// same tradeoff reduceCategoryOverspend.rule.ts's generic version accepts
// for every other category: categories are free-text, there's no reliable
// way to identify "the Food category" other than by its literal name.
export const FOOD_CATEGORY = "Food";
export const FOOD_SHARE_CRITICAL_THRESHOLD_PERCENT = 50;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const food = context.spendingAnalysis.topCategories.find((c) => c.category === FOOD_CATEGORY);
  if (!food || food.percentOfTotal <= FOOD_SHARE_CRITICAL_THRESHOLD_PERCENT) return [];

  const percent = Math.round(food.percentOfTotal);
  const estimatedMonthlySavings = Math.round(food.amount * REDUCTION_ASSUMPTION);

  return [
    {
      id: "food-share-critical",
      key: "foodShareCritical",
      priority: "high",
      estimatedMonthlySavings,
      confidence: "medium",
      params: { percent },
      ...ruleMessages("foodShareCritical", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "foodShareCritical",
  name: "Food Share Critical",
  description: "Fires when the Food category exceeds 50% of total spend — a more severe escalation of reduceCategoryOverspend's 40% threshold.",
  category: "expense",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
