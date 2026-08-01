import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const INCREASE_THRESHOLD_PERCENT = 10;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const incomeChange = context.cashFlowAnalysis.changeVsPreviousMonth.income;
  if (incomeChange === null || incomeChange < INCREASE_THRESHOLD_PERCENT) return [];

  const percent = Math.round(incomeChange);
  return [
    {
      id: "income-increasing",
      key: "incomeIncreasing",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { percent },
      ...ruleMessages("incomeIncreasing", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "incomeIncreasing",
  name: "Income Increasing",
  description: "Celebrates income up 10%+ vs. last month.",
  category: "income",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
