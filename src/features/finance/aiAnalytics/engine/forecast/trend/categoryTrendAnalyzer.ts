// Category Trend Analysis — mostly synthesis over the already-existing
// multiMonthTrends.monthlyValuesFor() primitive; the only genuinely new
// piece is a small per-category WEEKLY sum, since no per-category weekly
// bucketing exists upstream (only the aggregate spendingAnalysis.weeklyTrend
// does). Mirrors monthlyValuesFor's own shape, just swapping
// lastNMonthRanges for the already-existing lastNWeekRanges — kept local to
// this engine rather than added to the shared multiMonthTrends.ts, per the
// "don't touch prior-prompt files" precedent.
//
// Year-over-year trend is the spec's own explicitly-deferred "future
// support" item — no year-over-year data exists yet, so there's no stub
// field for it here.

import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { lastNWeekRanges } from "@/features/finance/utils/cashFlowMath";
import { monthlyValuesFor } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import { classifyDirection, lastTwoPointGrowth } from "@/features/finance/aiAnalytics/engine/forecast/trend/trendClassification";
import type { CategoryComparisonEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { Transaction } from "@/features/finance/types";
import type { CategoryTrendEntry, CategoryTrendResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

const TREND_MONTHS = 6;
const TREND_WEEKS = 6;

function weeklyValuesForCategory(transactions: Transaction[], category: string, weeks: number, now: Date): number[] {
  return lastNWeekRanges(weeks, now).map((w) =>
    transactions.filter((t) => t.type === "expense" && t.category === category && isDateWithinRange(t.date, w.range)).reduce((sum, t) => sum + t.amount, 0)
  );
}

function analyzeCategory(category: string, transactions: Transaction[], now: Date): CategoryTrendEntry {
  const monthlyValues = monthlyValuesFor(transactions, category, "expense", TREND_MONTHS, now);
  const weeklyValues = weeklyValuesForCategory(transactions, category, TREND_WEEKS, now);

  return {
    category,
    monthlyGrowthPercent: lastTwoPointGrowth(monthlyValues),
    weeklyGrowthPercent: lastTwoPointGrowth(weeklyValues),
    direction: classifyDirection(monthlyValues),
  };
}

export function analyzeCategoryTrends(transactions: Transaction[], categoryComparison: CategoryComparisonEntry[], now = new Date()): CategoryTrendResult {
  const entries = categoryComparison.map((c) => analyzeCategory(c.category, transactions, now));

  const increasing = entries.filter((e) => e.direction === "increasing");
  const decreasing = entries.filter((e) => e.direction === "decreasing");
  const stableCategories = entries.filter((e) => e.direction === "stable").map((e) => e.category);

  const fastestGrowingCategory =
    increasing.length === 0 ? null : increasing.reduce((top, e) => ((e.monthlyGrowthPercent ?? 0) > (top.monthlyGrowthPercent ?? 0) ? e : top)).category;
  const fastestDecliningCategory =
    decreasing.length === 0 ? null : decreasing.reduce((bottom, e) => ((e.monthlyGrowthPercent ?? 0) < (bottom.monthlyGrowthPercent ?? 0) ? e : bottom)).category;

  return { entries, fastestGrowingCategory, fastestDecliningCategory, stableCategories };
}
