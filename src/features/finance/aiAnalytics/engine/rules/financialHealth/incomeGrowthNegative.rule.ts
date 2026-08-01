import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const incomeChange = context.cashFlowAnalysis.changeVsPreviousMonth.income;
  if (incomeChange === null || incomeChange >= 0) return [];

  const percent = Math.round(Math.abs(incomeChange));
  return [
    {
      id: "income-growth-negative",
      key: "incomeGrowthNegative",
      // The spec's own "Warning" tier maps to "high" here — there's no
      // dedicated Warning priority in the 5-tier scale.
      priority: "high",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { percent },
      ...ruleMessages("incomeGrowthNegative", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "incomeGrowthNegative",
  name: "Income Growth Negative",
  description: "Fires when this month's income is down vs. last month.",
  category: "financialHealth",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
