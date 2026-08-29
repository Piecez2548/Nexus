import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// healthScore.ts's expenseRatio sub-score value is a raw ratio (expense /
// income), not a percentage — 0.8 means 80%.
const EXPENSE_RATIO_HIGH_THRESHOLD = 0.8;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const expenseRatio = context.ruleHealthSignals.subScores.find((s) => s.key === "expenseRatio");
  if (!expenseRatio || expenseRatio.value === null || expenseRatio.value <= EXPENSE_RATIO_HIGH_THRESHOLD) return [];

  const percent = Math.round(expenseRatio.value * 100);
  // No natural ฿ savings figure for "your expense ratio is high" on its own
  // — it's a structural warning, not a specific behavior to cut. Other
  // rules (over-budget categories, category overspend) carry the actual
  // savings estimates.
  return [
    {
      id: "expense-ratio-high",
      key: "expenseRatioHigh",
      priority: "high",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { percent },
      ...ruleMessages("expenseRatioHigh", {}, { percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "expenseRatioHigh",
  name: "Expense Ratio High",
  description: "Fires when the expense-ratio sub-score (expense / income) exceeds 80%.",
  category: "financialHealth",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
