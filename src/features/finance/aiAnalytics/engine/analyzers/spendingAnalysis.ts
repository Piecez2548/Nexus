import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import { lastNWeekRanges, pctChange, sumByType } from "@/features/finance/utils/cashFlowMath";
import { computeExpenseByCategory } from "@/features/finance/utils/expenseByCategory";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { Transaction } from "@/features/finance/types";

export interface TopCategoryEntry {
  category: string;
  amount: number;
  percentOfTotal: number;
}

export interface CategoryComparisonEntry {
  category: string;
  current: number;
  previous: number;
  // null when the category has no previous-period spend to compare against
  // (a brand-new category this month) — not Infinity, which would be
  // misleading to render.
  changePercent: number | null;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD, local calendar date
  amount: number;
}

export interface WeekdayAnalysisEntry {
  weekday: number; // Date.getDay() convention: 0 = Sunday .. 6 = Saturday
  total: number;
  count: number;
  average: number;
}

export interface WeeklyTrendPoint {
  weekStart: string; // YYYY-MM-DD, Monday-anchored local calendar date
  amount: number;
}

export interface SpendingAnalysisResult {
  topCategories: TopCategoryEntry[];
  categoryComparison: CategoryComparisonEntry[];
  monthlyTrend: CashFlowMonthPoint[];
  dailyTrend: DailyTrendPoint[];
  weekdayAnalysis: WeekdayAnalysisEntry[];
  weeklyTrend: WeeklyTrendPoint[];
  // Both null when there's no expense data in the relevant window — never a
  // fabricated ฿0 entry, which would misleadingly read as a real finding.
  highestSpendingDay: DailyTrendPoint | null;
  mostExpensiveWeek: WeeklyTrendPoint | null;
}

const WEEKLY_TREND_WINDOW_WEEKS = 8;

function previousMonthRange(now: Date) {
  return getCurrentPeriodRange("monthly", new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

// Wider trailing window than dailyTrend/weekdayAnalysis (current-month-only)
// — a week-over-week trend needs more than one month of runway to be a
// trend at all. Scoped to the full transaction list, not currentMonthExpenses.
function computeWeeklyTrend(transactions: Transaction[], now: Date): WeeklyTrendPoint[] {
  return lastNWeekRanges(WEEKLY_TREND_WINDOW_WEEKS, now).map((w) => ({
    weekStart: w.weekStart,
    amount: sumByType(transactions, "expense", w.range),
  }));
}

function maxByAmount<T extends { amount: number }>(points: T[]): T | null {
  const withSpend = points.filter((p) => p.amount > 0);
  if (withSpend.length === 0) return null;
  return withSpend.reduce((max, p) => (p.amount > max.amount ? p : max));
}

function computeTopCategories(currentMonthExpenses: Transaction[]): TopCategoryEntry[] {
  const byCategory = computeExpenseByCategory(currentMonthExpenses);
  const total = byCategory.reduce((sum, c) => sum + c.value, 0);

  return byCategory
    .map((c) => ({ category: c.name, amount: c.value, percentOfTotal: total > 0 ? (c.value / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

function computeCategoryComparison(currentMonthExpenses: Transaction[], previousMonthExpenses: Transaction[]): CategoryComparisonEntry[] {
  const current = new Map(computeExpenseByCategory(currentMonthExpenses).map((c) => [c.name, c.value]));
  const previous = new Map(computeExpenseByCategory(previousMonthExpenses).map((c) => [c.name, c.value]));

  const categories = new Set([...current.keys(), ...previous.keys()]);

  return [...categories]
    .map((category) => {
      const currentAmount = current.get(category) ?? 0;
      const previousAmount = previous.get(category) ?? 0;
      return { category, current: currentAmount, previous: previousAmount, changePercent: pctChange(currentAmount, previousAmount) };
    })
    .sort((a, b) => b.current - a.current);
}

function computeDailyTrend(currentMonthExpenses: Transaction[]): DailyTrendPoint[] {
  const byDay = new Map<string, number>();
  for (const t of currentMonthExpenses) {
    const day = t.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
  }

  return [...byDay.entries()].map(([date, amount]) => ({ date, amount })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

function computeWeekdayAnalysis(currentMonthExpenses: Transaction[]): WeekdayAnalysisEntry[] {
  const totals = new Array(7).fill(0) as number[];
  const counts = new Array(7).fill(0) as number[];

  for (const t of currentMonthExpenses) {
    const [year, month, day] = t.date.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    totals[weekday] += t.amount;
    counts[weekday] += 1;
  }

  return totals.map((total, weekday) => ({
    weekday,
    total,
    count: counts[weekday],
    average: counts[weekday] > 0 ? total / counts[weekday] : 0,
  }));
}

// `monthlyTrend` is passed in rather than recomputed — the orchestrator
// already produces it once via cashFlowAnalysis.ts, and reusing that exact
// array guarantees this section's monthly chart never disagrees with the
// Cash Flow Analysis section's.
export function analyzeSpending(transactions: Transaction[], monthlyTrend: CashFlowMonthPoint[], now = new Date()): SpendingAnalysisResult {
  const currentRange = getCurrentPeriodRange("monthly", now);
  const previousRange = previousMonthRange(now);

  const currentMonthExpenses = transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, currentRange));
  const previousMonthExpenses = transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, previousRange));

  const dailyTrend = computeDailyTrend(currentMonthExpenses);
  const weeklyTrend = computeWeeklyTrend(transactions, now);

  return {
    topCategories: computeTopCategories(currentMonthExpenses),
    categoryComparison: computeCategoryComparison(currentMonthExpenses, previousMonthExpenses),
    monthlyTrend,
    dailyTrend,
    weekdayAnalysis: computeWeekdayAnalysis(currentMonthExpenses),
    weeklyTrend,
    highestSpendingDay: maxByAmount(dailyTrend),
    mostExpensiveWeek: maxByAmount(weeklyTrend),
  };
}
