import { lastNMonthRanges, pctChange } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { TRANSPORT_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const WINDOW_MONTHS = 6;
const RISE_THRESHOLD_PERCENT = 20;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const aliasByKey = recipientAliasLookup(context.recipientProfiles);
  const transportExpenses = context.transactions.filter(
    (t) => t.type === "expense" && matchesKeywordFlag(t, TRANSPORT_KEYWORDS, aliasByKey)
  );

  const monthlyTotals = lastNMonthRanges(WINDOW_MONTHS, context.now).map((m) =>
    transportExpenses.filter((t) => isDateWithinRange(t.date, m.range)).reduce((sum, t) => sum + t.amount, 0)
  );

  const currentMonth = monthlyTotals[monthlyTotals.length - 1];
  const priorMonths = monthlyTotals.slice(0, -1);
  if (priorMonths.length === 0) return [];

  const priorAverage = priorMonths.reduce((sum, v) => sum + v, 0) / priorMonths.length;
  if (priorAverage <= 0 || currentMonth <= priorAverage) return [];

  // priorAverage > 0 is guaranteed by the guard above, so pctChange's
  // prev===0 null branch can never trigger here.
  const percent = Math.round(pctChange(currentMonth, priorAverage)!);
  if (percent < RISE_THRESHOLD_PERCENT) return [];

  const estimatedMonthlySavings = Math.round(currentMonth - priorAverage);

  return [
    {
      id: "transport-above-average",
      key: "transportAboveAverage",
      priority: "medium",
      estimatedMonthlySavings,
      confidence: "medium",
      params: { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) },
      ...ruleMessages("transportAboveAverage", {}, { percent, currentMonth: Math.round(currentMonth), priorAverage: Math.round(priorAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "transportAboveAverage",
  name: "Transport Above Average",
  description: "Fires when this month's keyword-matched transport spend is 20%+ above the trailing 5-month average.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
