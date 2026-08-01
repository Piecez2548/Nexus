import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// A budget spending less than a fifth of its cap isn't a problem to fix —
// it's informational: the cap may be set higher than this category
// actually needs.
const UNDERUTILIZED_THRESHOLD_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const entry of context.budgetAnalysis.entries) {
    if (entry.status !== "ok" || entry.percentage >= UNDERUTILIZED_THRESHOLD_PERCENT) continue;

    recommendations.push({
      id: `underutilized-budget-${entry.budget.category}`,
      key: "underutilizedBudget",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { category: entry.budget.category, percent: Math.round(entry.percentage) },
      ...ruleMessages("underutilizedBudget", { category: entry.budget.category }, { category: entry.budget.category, percent: Math.round(entry.percentage) }),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "underutilizedBudget",
  name: "Underutilized Budget",
  description: "Fires for any budget using under 20% of its cap this period — an informational nudge, not a problem.",
  category: "budget",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
