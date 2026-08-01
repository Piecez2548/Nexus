import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Surfaces forecast.budgetOverflowRisk (budgets still "ok"/"near" today but
// on pace to bust by period-end) as an actual recommendation — today it
// only feeds the upcomingBudgetRisk insight, with no matching action item.
function evaluate(context: RuleContext): RecommendationDraft[] {
  return context.forecast.budgetOverflowRisk.map((risk) => {
    const budgetEntry = context.budgetAnalysis.entries.find((e) => e.budget.category === risk.category);
    const budgetAmount = budgetEntry?.budget.amount ?? 0;
    const estimatedMonthlySavings = Math.max(0, Math.round(risk.projectedSpend - budgetAmount));
    const percent = Math.round(risk.projectedPercentage);

    return {
      id: `forecast-budget-overflow-${risk.category}`,
      key: "forecastBudgetOverflow",
      priority: "high",
      estimatedMonthlySavings,
      // A linear-pace projection, not a measured fact.
      confidence: "medium",
      params: { category: risk.category, percent },
      ...ruleMessages("forecastBudgetOverflow", { category: risk.category }, { category: risk.category, percent }),
    };
  });
}

const rule: FinancialRule = {
  id: "forecastBudgetOverflow",
  name: "Forecast Budget Overflow",
  description: "One recommendation per budget on pace to exceed its cap by period-end, per forecast.budgetOverflowRisk.",
  category: "forecast",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
