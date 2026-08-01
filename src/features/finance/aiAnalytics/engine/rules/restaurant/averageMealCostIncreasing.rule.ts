import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import { FOOD_CATEGORY } from "@/features/finance/aiAnalytics/engine/rules/food/foodShareCritical.rule";
import type { Transaction } from "@/features/finance/types";
import type { PeriodRange } from "@/features/finance/utils/periodRange";

// Two trailing 3-month halves (6 months total) — wide enough that a single
// unusually large purchase doesn't read as "meal cost is rising".
const HALF_WINDOW_MONTHS = 3;
const RISE_THRESHOLD_PERCENT = 10;

function averageAmount(transactions: Transaction[], range: PeriodRange): number {
  const matches = transactions.filter((t) => t.type === "expense" && t.category === FOOD_CATEGORY && isDateWithinRange(t.date, range));
  if (matches.length === 0) return 0;
  return matches.reduce((sum, t) => sum + t.amount, 0) / matches.length;
}

function evaluate(context: RuleContext): RecommendationDraft[] {
  const months = lastNMonthRanges(HALF_WINDOW_MONTHS * 2, context.now);
  const previousRange: PeriodRange = { start: months[0].range.start, end: months[HALF_WINDOW_MONTHS - 1].range.end };
  const currentRange: PeriodRange = { start: months[HALF_WINDOW_MONTHS].range.start, end: months[months.length - 1].range.end };

  const previousAverage = averageAmount(context.transactions, previousRange);
  const currentAverage = averageAmount(context.transactions, currentRange);
  if (previousAverage <= 0 || currentAverage <= previousAverage) return [];

  const percent = Math.round(((currentAverage - previousAverage) / previousAverage) * 100);
  if (percent < RISE_THRESHOLD_PERCENT) return [];

  return [
    {
      id: "average-meal-cost-increasing",
      key: "averageMealCostIncreasing",
      priority: "information",
      // An observation, not a specific action to cut — no savings estimate.
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { percent, currentAverage: Math.round(currentAverage), previousAverage: Math.round(previousAverage) },
      ...ruleMessages("averageMealCostIncreasing", {}, { percent, currentAverage: Math.round(currentAverage), previousAverage: Math.round(previousAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "averageMealCostIncreasing",
  name: "Average Meal Cost Increasing",
  description: "Fires when the average Food-category transaction size has risen 10%+ across two trailing 3-month halves.",
  category: "expense",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
