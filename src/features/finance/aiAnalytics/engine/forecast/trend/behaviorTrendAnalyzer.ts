// Behavior Trend — restaurant/coffee/shopping read Prompt 007's already-
// computed monthlyTrend series directly (zero recomputation). subscriptionCost
// is a genuine 2-point comparison (SubscriptionEntry only ever tracks its
// last two charge amounts, never a full monthly series), so it uses its own
// 2-point classifier rather than classifyDirection's 3-point trailing-run
// logic, which can never fire "increasing"/"decreasing" on just 2 points.
// weekendSpending is the one genuinely new piece — nothing upstream tracks
// weekend-only spend per trailing month, only the current-window flag in
// behaviorAnalysis.ts — so a small local multi-month weekend-only bucketing
// helper is added here (kept local rather than added to the shared
// multiMonthTrends.ts, per the "don't touch prior-prompt files" precedent).

import { lastNMonthRanges, pctChange } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { classifyDirection, lastTwoPointGrowth } from "@/features/finance/aiAnalytics/engine/forecast/trend/trendClassification";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { DomainTrendPoint } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { Transaction } from "@/features/finance/types";
import type { BehaviorTrendDomain, BehaviorTrendEntry, BehaviorTrendResult, TrendDirection } from "@/features/finance/aiAnalytics/engine/forecast/types";

const TREND_MONTHS = 6;
// A 2-point comparison needs its own, more sensitive band than the
// multi-month trailing-run logic — a single genuine data point pair can't
// establish a "run", so this just reads the sign/magnitude of the change.
const TWO_POINT_STABLE_BAND_PERCENT = 10;

function domainTrendEntry(domain: BehaviorTrendDomain, monthlyTrend: DomainTrendPoint[]): BehaviorTrendEntry {
  const values = monthlyTrend.map((p) => p.amount);
  return { domain, changePercent: lastTwoPointGrowth(values), direction: classifyDirection(values) };
}

function classifyTwoPointChange(changePercent: number | null): TrendDirection {
  if (changePercent === null) return "insufficientData";
  if (changePercent > TWO_POINT_STABLE_BAND_PERCENT) return "increasing";
  if (changePercent < -TWO_POINT_STABLE_BAND_PERCENT) return "decreasing";
  return "stable";
}

function subscriptionCostEntry(subscriptions: SubscriptionEntry[]): BehaviorTrendEntry {
  if (subscriptions.length === 0) return { domain: "subscriptionCost", changePercent: null, direction: "insufficientData" };

  const lastTotal = subscriptions.reduce((sum, s) => sum + s.lastAmount, 0);
  const previousTotal = subscriptions.reduce((sum, s) => sum + s.previousAmount, 0);
  const changePercent = pctChange(lastTotal, previousTotal);

  return { domain: "subscriptionCost", changePercent, direction: classifyTwoPointChange(changePercent) };
}

function isWeekend(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function monthlyWeekendExpense(transactions: Transaction[], months: number, now: Date): number[] {
  return lastNMonthRanges(months, now).map((m) =>
    transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, m.range) && isWeekend(t.date)).reduce((sum, t) => sum + t.amount, 0)
  );
}

function weekendSpendingEntry(transactions: Transaction[], now: Date): BehaviorTrendEntry {
  const values = monthlyWeekendExpense(transactions, TREND_MONTHS, now);
  return { domain: "weekendSpending", changePercent: lastTwoPointGrowth(values), direction: classifyDirection(values) };
}

export function analyzeBehaviorTrends(
  foodMonthlyTrend: DomainTrendPoint[],
  coffeeMonthlyTrend: DomainTrendPoint[],
  shoppingMonthlyTrend: DomainTrendPoint[],
  subscriptions: SubscriptionEntry[],
  transactions: Transaction[],
  now = new Date()
): BehaviorTrendResult {
  return {
    entries: [
      domainTrendEntry("restaurant", foodMonthlyTrend),
      domainTrendEntry("coffee", coffeeMonthlyTrend),
      domainTrendEntry("shopping", shoppingMonthlyTrend),
      subscriptionCostEntry(subscriptions),
      weekendSpendingEntry(transactions, now),
    ],
  };
}
