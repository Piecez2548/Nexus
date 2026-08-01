import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { toLocalDateString } from "@/utils/localDate";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const MIN_STREAK_DAYS = 5;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const expenses = context.transactions.filter((t) => t.type === "expense");
  // No expense history at all isn't a "streak" worth celebrating — it's an
  // empty profile. Without this guard, a brand-new profile with zero
  // transactions would fire every time (nothing to break the streak).
  if (expenses.length === 0) return [];

  const range = getCurrentPeriodRange("monthly", context.now);
  const expenseDates = new Set(expenses.map((t) => t.date));

  const monthStart = toLocalDateString(range.start);
  let streak = 0;
  const cursor = new Date(context.now);

  // Walk backward from today counting consecutive no-expense days, never
  // past the start of the current month — a "streak" spanning into a
  // previous, already-closed period isn't a live habit worth celebrating.
  while (toLocalDateString(cursor) >= monthStart) {
    if (expenseDates.has(toLocalDateString(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  if (streak < MIN_STREAK_DAYS) return [];

  return [
    {
      id: "no-spending-streak",
      key: "noSpendingStreak",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { days: streak },
      ...ruleMessages("noSpendingStreak", {}, { days: streak }),
    },
  ];
}

const rule: FinancialRule = {
  id: "noSpendingStreak",
  name: "No-Spending Streak",
  description: "Celebrates 5+ consecutive days with no expense transactions, within the current month.",
  category: "behavior",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
