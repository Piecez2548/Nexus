import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const { entries, overCount, nearCount } = context.budgetAnalysis;
  if (entries.length === 0 || overCount > 0 || nearCount > 0) return [];

  return [
    {
      id: "budget-respected",
      key: "budgetRespected",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { count: entries.length },
      ...ruleMessages("budgetRespected", {}, { count: entries.length }),
    },
  ];
}

const rule: FinancialRule = {
  id: "budgetRespected",
  name: "Budget Respected",
  description: "Celebrates every budget being comfortably within its cap this period, with at least one budget set.",
  category: "budget",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
