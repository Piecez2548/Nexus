import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { trailingConsecutiveCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";

const MIN_CONSECUTIVE_MONTHS = 3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  // cashFlowAnalysis.monthlyTrend already carries netCashFlow per trailing
  // month — no need to recompute it via multiMonthTrends' transaction-level
  // helpers, just walk the existing figures.
  const values = context.cashFlowAnalysis.monthlyTrend.map((m) => m.netCashFlow);
  const negativeMonths = trailingConsecutiveCount(values, (v) => v < 0);
  if (negativeMonths < MIN_CONSECUTIVE_MONTHS) return [];

  const latestDeficit = Math.round(Math.abs(values[values.length - 1]));

  return [
    {
      id: "repeated-negative-cash-flow",
      key: "repeatedNegativeCashFlow",
      // A sustained multi-month pattern, not a single bad month — the most
      // severe cash-flow signal in this registry.
      priority: "critical",
      estimatedMonthlySavings: latestDeficit,
      confidence: "high",
      params: { months: negativeMonths },
      ...ruleMessages("repeatedNegativeCashFlow", {}, { months: negativeMonths }),
    },
  ];
}

const rule: FinancialRule = {
  id: "repeatedNegativeCashFlow",
  name: "Repeated Negative Cash Flow",
  description: "Fires when net cash flow has been negative for 3+ consecutive trailing months.",
  category: "cashFlow",
  defaultPriority: "critical",
  enabled: true,
  evaluate,
};

export default rule;
