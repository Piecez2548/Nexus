import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  if (context.cashFlowAnalysis.netCashFlow >= 0) return [];

  const deficit = Math.round(Math.abs(context.cashFlowAnalysis.netCashFlow));
  return [
    {
      id: "negative-cash-flow",
      key: "negativeCashFlow",
      priority: "high",
      // The deficit itself — the actual ฿ figure that needs closing to
      // break even this month.
      estimatedMonthlySavings: deficit,
      confidence: "high",
      params: { deficit },
      ...ruleMessages("negativeCashFlow", {}, { deficit }),
    },
  ];
}

const rule: FinancialRule = {
  id: "negativeCashFlow",
  name: "Negative Cash Flow",
  description: "Fires when this month's net cash flow (income minus expense) is negative.",
  category: "cashFlow",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
