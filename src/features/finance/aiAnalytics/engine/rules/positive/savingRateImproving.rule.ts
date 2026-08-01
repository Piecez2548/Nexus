import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const IMPROVEMENT_THRESHOLD_PERCENT = 10;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const savingChange = context.cashFlowAnalysis.changeVsPreviousMonth.saving;
  // A shrinking deficit can also read as a positive % change — require this
  // month's saving to actually be positive, not just "less negative".
  if (savingChange === null || savingChange < IMPROVEMENT_THRESHOLD_PERCENT || context.cashFlowAnalysis.saving <= 0) return [];

  const percent = Math.round(savingChange);
  return [
    {
      id: "saving-rate-improving",
      key: "savingRateImproving",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { percent },
      ...ruleMessages("savingRateImproving", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "savingRateImproving",
  name: "Saving Rate Improving",
  description: "Celebrates a positive saving month with saving up 10%+ vs. last month.",
  category: "savings",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
