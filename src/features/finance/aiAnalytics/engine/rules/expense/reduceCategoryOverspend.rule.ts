import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { FOOD_CATEGORY, FOOD_SHARE_CRITICAL_THRESHOLD_PERCENT } from "@/features/finance/aiAnalytics/engine/rules/food/foodShareCritical.rule";

const CATEGORY_OVERSPEND_SHARE_THRESHOLD_PERCENT = 40;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];
  // Self-contained dedup: a category already over its own budget gets
  // reduceOverBudgetCategory instead — that's strictly more actionable
  // (a hard cap crossed) than merely having a large share of spend. Reads
  // budgetAnalysis directly rather than depending on the other rule file,
  // so this rule stays independently evaluable/testable.
  const overBudgetCategories = new Set(
    context.budgetAnalysis.entries.filter((e) => e.status === "over" && e.potentialMonthlySavings !== null).map((e) => e.budget.category)
  );

  for (const category of context.spendingAnalysis.topCategories) {
    if (category.percentOfTotal <= CATEGORY_OVERSPEND_SHARE_THRESHOLD_PERCENT) continue;
    if (overBudgetCategories.has(category.category)) continue;
    // Food above the critical threshold gets foodShareCritical's more
    // urgent framing instead — only imports the threshold constant (not
    // the rule itself), so this stays independently evaluable.
    if (category.category === FOOD_CATEGORY && category.percentOfTotal > FOOD_SHARE_CRITICAL_THRESHOLD_PERCENT) continue;

    const estimatedMonthlySavings = Math.round(category.amount * REDUCTION_ASSUMPTION);
    recommendations.push({
      id: `reduce-category-overspend-${category.category}`,
      key: "reduceCategoryOverspend",
      priority: priorityForSavings(estimatedMonthlySavings),
      estimatedMonthlySavings,
      // No transaction-count proxy on a TopCategoryEntry to size confidence
      // by — a share-of-spend heuristic is inherently less certain than a
      // hard budget breach, so it's flat "medium".
      confidence: "medium",
      params: { category: category.category, percent: Math.round(category.percentOfTotal) },
      ...ruleMessages(
        "reduceCategoryOverspend",
        { category: category.category },
        { category: category.category, percent: Math.round(category.percentOfTotal) }
      ),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "reduceCategoryOverspend",
  name: "Reduce Category Overspend",
  description: "Any category over 40% share of total spend, excluding categories already over their own budget.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
