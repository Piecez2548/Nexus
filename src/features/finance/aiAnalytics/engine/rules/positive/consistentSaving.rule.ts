import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { trailingConsecutiveCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";

const MIN_CONSECUTIVE_MONTHS = 3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const values = context.cashFlowAnalysis.monthlyTrend.map((m) => m.saving);
  const positiveMonths = trailingConsecutiveCount(values, (v) => v > 0);
  if (positiveMonths < MIN_CONSECUTIVE_MONTHS) return [];

  return [
    {
      id: "consistent-saving",
      key: "consistentSaving",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { months: positiveMonths },
      ...ruleMessages("consistentSaving", {}, { months: positiveMonths }),
    },
  ];
}

const rule: FinancialRule = {
  id: "consistentSaving",
  name: "Consistent Saving",
  description: "Celebrates positive saving for 3+ consecutive trailing months.",
  category: "savings",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
