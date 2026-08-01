import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// A narrower, earlier-warning band than budgetAnalysis.ts's own "near"
// status (80%+) — this rule only fires once a budget is genuinely close to
// its cap, not just past the general near-limit line.
const NEAR_THRESHOLD_PERCENT = 90;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const entry of context.budgetAnalysis.entries) {
    if (entry.status === "over" || entry.percentage < NEAR_THRESHOLD_PERCENT) continue;

    recommendations.push({
      id: `budget-near-90-${entry.budget.category}`,
      key: "budgetNear90",
      priority: "low",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { category: entry.budget.category, percent: Math.round(entry.percentage) },
      ...ruleMessages("budgetNear90", { category: entry.budget.category }, { category: entry.budget.category, percent: Math.round(entry.percentage) }),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "budgetNear90",
  name: "Budget Near 90%",
  description: "Fires for any budget at 90%+ utilization this period, but not yet over.",
  category: "budget",
  defaultPriority: "low",
  enabled: true,
  evaluate,
};

export default rule;
