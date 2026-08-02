import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const SPIKE_THRESHOLD_PERCENT = 50;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const monthlyExpenses = context.cashFlowAnalysis.monthlyTrend.map((m) => m.expense);
  const currentMonth = monthlyExpenses[monthlyExpenses.length - 1];
  const priorMonths = monthlyExpenses.slice(0, -1);
  if (priorMonths.length === 0) return [];

  const priorAverage = priorMonths.reduce((sum, v) => sum + v, 0) / priorMonths.length;
  if (priorAverage <= 0 || currentMonth <= priorAverage) return [];

  // priorAverage > 0 is guaranteed by the guard above, so pctChange's
  // prev===0 null branch can never trigger here.
  const percent = Math.round(pctChange(currentMonth, priorAverage)!);
  if (percent < SPIKE_THRESHOLD_PERCENT) return [];

  return [
    {
      id: "expense-spike",
      key: "expenseSpike",
      priority: "high",
      estimatedMonthlySavings: Math.round(currentMonth - priorAverage),
      confidence: "high",
      params: { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) },
      ...ruleMessages("expenseSpike", {}, { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "expenseSpike",
  name: "Expense Spike",
  description: "Fires when this month's total expense is 50%+ above the trailing 5-month average.",
  category: "cashFlow",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
