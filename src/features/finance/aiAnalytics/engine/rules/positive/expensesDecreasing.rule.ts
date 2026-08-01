import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const DECREASE_THRESHOLD_PERCENT = 10;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const expenseChange = context.cashFlowAnalysis.changeVsPreviousMonth.expense;
  if (expenseChange === null || expenseChange > -DECREASE_THRESHOLD_PERCENT) return [];

  const percent = Math.round(Math.abs(expenseChange));
  return [
    {
      id: "expenses-decreasing",
      key: "expensesDecreasing",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { percent },
      ...ruleMessages("expensesDecreasing", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "expensesDecreasing",
  name: "Expenses Decreasing",
  description: "Celebrates total expense down 10%+ vs. last month.",
  category: "expense",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
