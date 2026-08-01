import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const SHOPPING_CATEGORY = "Shopping";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const range = getCurrentPeriodRange("monthly", context.now);
  const shoppingExpenses = context.transactions.filter(
    (t) => t.type === "expense" && t.category === SHOPPING_CATEGORY && isDateWithinRange(t.date, range)
  );

  let weekendTotal = 0;
  let weekendCount = 0;
  let weekdayTotal = 0;
  let weekdayCount = 0;

  for (const t of shoppingExpenses) {
    const [year, month, day] = t.date.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) {
      weekendTotal += t.amount;
      weekendCount++;
    } else {
      weekdayTotal += t.amount;
      weekdayCount++;
    }
  }

  if (weekendCount === 0 || weekdayCount === 0) return [];

  // Per-transaction averages, not raw totals — matches insights.ts's own
  // weekendOverspending rule: 2 weekend days can never outspend 5 weekdays
  // in raw sums, so a literal total comparison would rarely fire.
  const weekendAverage = weekendTotal / weekendCount;
  const weekdayAverage = weekdayTotal / weekdayCount;
  if (weekendAverage <= weekdayAverage) return [];

  return [
    {
      id: "weekend-shopping",
      key: "weekendShopping",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) },
      ...ruleMessages("weekendShopping", {}, { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "weekendShopping",
  name: "Weekend Shopping",
  description: "Fires when this month's average weekend Shopping purchase exceeds the average weekday one.",
  category: "expense",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
