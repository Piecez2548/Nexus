import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { monthlyValuesFor, trailingConsecutiveCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";

const TREND_WINDOW_MONTHS = 3;
const MIN_CONSECUTIVE_MONTHS = 2;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const budget of context.budgets) {
    // Weekly/yearly budgets have a different "how many periods have passed"
    // calculation this doesn't do — v1 simplification, matches
    // forecast.ts's own budgetOverflowRisk scoping.
    if (budget.period !== "monthly" || budget.amount <= 0) continue;

    const monthlySpend = monthlyValuesFor(context.transactions, budget.category, "expense", TREND_WINDOW_MONTHS, context.now);
    const overMonths = trailingConsecutiveCount(monthlySpend, (spent) => spent > budget.amount);
    if (overMonths < MIN_CONSECUTIVE_MONTHS) continue;

    const currentEntry = context.budgetAnalysis.entries.find((e) => e.budget.category === budget.category);
    const estimatedMonthlySavings = currentEntry?.potentialMonthlySavings ?? Math.max(0, monthlySpend[monthlySpend.length - 1] - budget.amount);

    recommendations.push({
      id: `repeated-budget-overflow-${budget.category}`,
      key: "repeatedBudgetOverflow",
      // A pattern across multiple real periods, not a single-period
      // estimate — more urgent than a one-off over-budget month.
      priority: "high",
      estimatedMonthlySavings,
      confidence: "high",
      params: { category: budget.category, months: overMonths },
      ...ruleMessages(
        "repeatedBudgetOverflow",
        { category: budget.category },
        { category: budget.category, months: overMonths },
        { category: budget.category, cap: budget.amount }
      ),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "repeatedBudgetOverflow",
  name: "Repeated Budget Overflow",
  description: "Fires when a monthly budget has been over its cap for 2+ consecutive trailing months.",
  category: "budget",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
