import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// The 10-20% band specifically — below 10% is savingRateCritical's job
// instead (a more urgent tier), so this rule explicitly excludes it rather
// than risk double-firing on the same underlying signal.
const SAVING_RATE_LOW_BAND_PERCENT = 10;
const SAVING_RATE_TARGET_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const savingRate = context.healthScore.subScores.find((s) => s.key === "savingRate");
  if (
    !savingRate ||
    savingRate.value === null ||
    savingRate.value < SAVING_RATE_LOW_BAND_PERCENT ||
    savingRate.value >= SAVING_RATE_TARGET_PERCENT ||
    context.cashFlowAnalysis.income <= 0
  )
    return [];

  const targetSavings = context.cashFlowAnalysis.income * (SAVING_RATE_TARGET_PERCENT / 100);
  const currentSavings = context.cashFlowAnalysis.income * (savingRate.value / 100);
  const estimatedMonthlySavings = Math.round(targetSavings - currentSavings);
  if (estimatedMonthlySavings <= 0) return [];

  return [
    {
      id: "increase-saving-rate",
      key: "increaseSavingRate",
      priority: priorityForSavings(estimatedMonthlySavings),
      estimatedMonthlySavings,
      // A trend-based estimate with no natural sample-size proxy.
      confidence: "medium",
      params: { currentRate: Math.round(savingRate.value), targetRate: SAVING_RATE_TARGET_PERCENT },
      ...ruleMessages("increaseSavingRate", {}, { currentRate: Math.round(savingRate.value), targetRate: SAVING_RATE_TARGET_PERCENT }),
    },
  ];
}

const rule: FinancialRule = {
  id: "increaseSavingRate",
  name: "Increase Saving Rate",
  description: "Fires when the saving-rate sub-score is in the 10-20% band, with a positive income to measure against.",
  category: "savings",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
