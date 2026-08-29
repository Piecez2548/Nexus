import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const SAVING_RATE_CRITICAL_THRESHOLD_PERCENT = 10;
// Same 20% target increaseSavingRate.rule.ts uses for its 10-20% band —
// this rule just escalates the priority when the starting point is below
// 10%, it doesn't aim for a different destination.
const SAVING_RATE_TARGET_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const savingRate = context.ruleHealthSignals.subScores.find((s) => s.key === "savingRate");
  if (!savingRate || savingRate.value === null || savingRate.value >= SAVING_RATE_CRITICAL_THRESHOLD_PERCENT || context.cashFlowAnalysis.income <= 0) return [];

  const targetSavings = context.cashFlowAnalysis.income * (SAVING_RATE_TARGET_PERCENT / 100);
  const currentSavings = context.cashFlowAnalysis.income * (savingRate.value / 100);
  const estimatedMonthlySavings = Math.round(targetSavings - currentSavings);
  if (estimatedMonthlySavings <= 0) return [];

  return [
    {
      id: "saving-rate-critical",
      key: "savingRateCritical",
      // A saving rate this low is a severe signal regardless of the ฿
      // figure it implies — set explicitly rather than derived from
      // estimatedMonthlySavings like most other rules.
      priority: "critical",
      estimatedMonthlySavings,
      confidence: "medium",
      params: { currentRate: Math.round(savingRate.value), threshold: SAVING_RATE_CRITICAL_THRESHOLD_PERCENT },
      ...ruleMessages(
        "savingRateCritical",
        {},
        { currentRate: Math.round(savingRate.value), threshold: SAVING_RATE_CRITICAL_THRESHOLD_PERCENT },
        { targetRate: SAVING_RATE_TARGET_PERCENT }
      ),
    },
  ];
}

const rule: FinancialRule = {
  id: "savingRateCritical",
  name: "Saving Rate Critical",
  description: "Fires when the saving-rate sub-score is below 10%, with a positive income to measure against.",
  category: "financialHealth",
  defaultPriority: "critical",
  enabled: true,
  evaluate,
};

export default rule;
