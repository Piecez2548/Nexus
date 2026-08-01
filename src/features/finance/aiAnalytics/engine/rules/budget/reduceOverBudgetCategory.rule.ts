import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const entry of context.budgetAnalysis.entries) {
    if (entry.status !== "over" || entry.potentialMonthlySavings === null) continue;

    const overAmount = entry.spent - entry.budget.amount;
    recommendations.push({
      id: `reduce-budget-${entry.budget.category}`,
      key: "reduceOverBudgetCategory",
      priority: priorityForSavings(entry.potentialMonthlySavings),
      estimatedMonthlySavings: entry.potentialMonthlySavings,
      // A measured fact about the current period (the budget was actually
      // crossed), not an inferred pattern — always "high", unlike most
      // other rules, which estimate from a sample.
      confidence: "high",
      params: { category: entry.budget.category },
      ...ruleMessages(
        "reduceOverBudgetCategory",
        { category: entry.budget.category },
        { category: entry.budget.category, overAmount },
        { cap: entry.suggestedMonthlyCap ?? entry.budget.amount }
      ),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "reduceOverBudgetCategory",
  name: "Reduce Over-Budget Category",
  description: "One recommendation per budget currently over 100% of its cap this period.",
  category: "budget",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
