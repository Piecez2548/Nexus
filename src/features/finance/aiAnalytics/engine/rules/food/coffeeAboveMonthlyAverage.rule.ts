import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { BEHAVIOR_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Coffee is a keyword match (title/category/recipient alias), not a
// category — the same purchase could land in "Food" or "Shopping" — so
// this reuses behaviorAnalysis.ts's own matching helpers rather than
// filtering by category like the Food-specific rules above.
const WINDOW_MONTHS = 6;
const RISE_THRESHOLD_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const aliasByKey = recipientAliasLookup(context.recipientProfiles);
  const coffeeExpenses = context.transactions.filter(
    (t) => t.type === "expense" && matchesKeywordFlag(t, BEHAVIOR_KEYWORDS.coffee, aliasByKey)
  );

  const monthlyTotals = lastNMonthRanges(WINDOW_MONTHS, context.now).map((m) =>
    coffeeExpenses.filter((t) => isDateWithinRange(t.date, m.range)).reduce((sum, t) => sum + t.amount, 0)
  );

  const currentMonth = monthlyTotals[monthlyTotals.length - 1];
  const priorMonths = monthlyTotals.slice(0, -1);
  if (priorMonths.length === 0) return [];

  const priorAverage = priorMonths.reduce((sum, v) => sum + v, 0) / priorMonths.length;
  if (priorAverage <= 0 || currentMonth <= priorAverage) return [];

  const percent = Math.round(((currentMonth - priorAverage) / priorAverage) * 100);
  if (percent < RISE_THRESHOLD_PERCENT) return [];

  // The gap above the normal monthly average, not a flat reduction
  // fraction — the ask here is "get back to your usual pace", not "cut by
  // 30%".
  const estimatedMonthlySavings = Math.round(currentMonth - priorAverage);

  return [
    {
      id: "coffee-above-monthly-average",
      key: "coffeeAboveMonthlyAverage",
      priority: "medium",
      estimatedMonthlySavings,
      confidence: "medium",
      params: { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) },
      ...ruleMessages("coffeeAboveMonthlyAverage", {}, { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "coffeeAboveMonthlyAverage",
  name: "Coffee Above Monthly Average",
  description: "Fires when this month's keyword-matched coffee spend is 20%+ above the trailing 5-month average.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
