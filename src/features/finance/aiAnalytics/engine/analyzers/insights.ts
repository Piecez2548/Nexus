import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";

export type AiInsightKey =
  | "highestSpendingCategory"
  | "fastestGrowingCategory"
  | "budgetExceeded"
  | "spendingTrend"
  | "savingsTrend"
  | "cashFlowSummary"
  | "largestTransaction"
  | "highestSpendingDay"
  | "mostExpensiveWeek"
  | "upcomingBudgetRisk"
  | "weekendOverspending";

export interface AiInsight {
  id: string;
  key: AiInsightKey;
  severity: "info" | "warning";
  // Structured, never pre-formatted strings — the component interpolates
  // via t(`aiAnalytics.insights.${key}`, params), matching this codebase's
  // i18n convention instead of baking language-specific text into the
  // engine (see spendingAlerts.ts, which predates this and does the
  // opposite — deliberately left as-is there, not retrofitted).
  params: Record<string, string | number>;
}

// A category counts as "growing" only when it existed last period too —
// a brand-new category this month has no previous baseline (changePercent
// is null), and flagging it as the "fastest growing" would be misleading.
const GROWTH_WARNING_THRESHOLD_PERCENT = 15;

export function generateInsights(
  spendingAnalysis: SpendingAnalysisResult,
  budgetAnalysis: BudgetAnalysisResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  behaviorAnalysis: BehaviorAnalysisResult,
  forecast: ForecastResult
): AiInsight[] {
  const insights: AiInsight[] = [];

  const [topCategory] = spendingAnalysis.topCategories;
  if (topCategory) {
    insights.push({
      id: "highest-spending-category",
      key: "highestSpendingCategory",
      severity: "info",
      params: { category: topCategory.category, amount: topCategory.amount, percent: Math.round(topCategory.percentOfTotal) },
    });
  }

  const growing = spendingAnalysis.categoryComparison
    .filter((c) => c.changePercent !== null && c.changePercent > 0 && c.previous > 0)
    .sort((a, b) => b.changePercent! - a.changePercent!)[0];
  if (growing) {
    insights.push({
      id: `fastest-growing-category-${growing.category}`,
      key: "fastestGrowingCategory",
      severity: growing.changePercent! >= GROWTH_WARNING_THRESHOLD_PERCENT ? "warning" : "info",
      params: { category: growing.category, percent: Math.round(growing.changePercent!) },
    });
  }

  for (const entry of budgetAnalysis.entries) {
    if (entry.status !== "over") continue;
    insights.push({
      id: `budget-exceeded-${entry.budget.category}`,
      key: "budgetExceeded",
      severity: "warning",
      params: { category: entry.budget.category, spent: entry.spent, budget: entry.budget.amount },
    });
  }

  const expenseChange = cashFlowAnalysis.changeVsPreviousMonth.expense;
  if (expenseChange !== null && expenseChange !== 0) {
    insights.push({
      id: "spending-trend",
      key: "spendingTrend",
      severity: expenseChange >= GROWTH_WARNING_THRESHOLD_PERCENT ? "warning" : "info",
      params: { percent: Math.round(Math.abs(expenseChange)), direction: expenseChange > 0 ? "up" : "down" },
    });
  }

  const savingChange = cashFlowAnalysis.changeVsPreviousMonth.saving;
  if (savingChange !== null && savingChange !== 0) {
    insights.push({
      id: "savings-trend",
      key: "savingsTrend",
      severity: savingChange < 0 ? "warning" : "info",
      params: { percent: Math.round(Math.abs(savingChange)), direction: savingChange > 0 ? "up" : "down" },
    });
  }

  insights.push({
    id: "cash-flow-summary",
    key: "cashFlowSummary",
    severity: cashFlowAnalysis.netCashFlow >= 0 ? "info" : "warning",
    params: { income: cashFlowAnalysis.income, expense: cashFlowAnalysis.expense, netCashFlow: cashFlowAnalysis.netCashFlow },
  });

  const [largestPurchase] = behaviorAnalysis.largePurchases;
  if (largestPurchase) {
    insights.push({
      id: "largest-transaction",
      key: "largestTransaction",
      severity: "info",
      params: { title: largestPurchase.title, amount: largestPurchase.amount },
    });
  }

  if (spendingAnalysis.highestSpendingDay) {
    insights.push({
      id: "highest-spending-day",
      key: "highestSpendingDay",
      severity: "info",
      params: { date: spendingAnalysis.highestSpendingDay.date, amount: spendingAnalysis.highestSpendingDay.amount },
    });
  }

  if (spendingAnalysis.mostExpensiveWeek) {
    insights.push({
      id: "most-expensive-week",
      key: "mostExpensiveWeek",
      severity: "info",
      params: { weekStart: spendingAnalysis.mostExpensiveWeek.weekStart, amount: spendingAnalysis.mostExpensiveWeek.amount },
    });
  }

  for (const risk of forecast.budgetOverflowRisk) {
    insights.push({
      id: `upcoming-budget-risk-${risk.category}`,
      key: "upcomingBudgetRisk",
      severity: "warning",
      params: { category: risk.category, percent: Math.round(risk.projectedPercentage) },
    });
  }

  // Compares per-transaction averages, not raw totals — 2 weekend days can
  // never outspend 5 weekdays in raw sums, so a literal total-vs-total
  // comparison would never fire. Per-calendar-day would be more literal to
  // "weekend vs weekday spending", but weekdayAnalysis only carries a
  // transaction count, not how many Saturdays/Sundays occurred in the
  // month — per-transaction is the honest metric this data actually supports.
  const weekend = spendingAnalysis.weekdayAnalysis.filter((w) => w.weekday === 0 || w.weekday === 6);
  const weekday = spendingAnalysis.weekdayAnalysis.filter((w) => w.weekday >= 1 && w.weekday <= 5);
  const weekendCount = weekend.reduce((sum, w) => sum + w.count, 0);
  const weekdayCount = weekday.reduce((sum, w) => sum + w.count, 0);

  if (weekendCount > 0 && weekdayCount > 0) {
    const weekendAverage = weekend.reduce((sum, w) => sum + w.total, 0) / weekendCount;
    const weekdayAverage = weekday.reduce((sum, w) => sum + w.total, 0) / weekdayCount;

    if (weekendAverage > weekdayAverage) {
      insights.push({
        id: "weekend-overspending",
        key: "weekendOverspending",
        severity: "info",
        params: { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) },
      });
    }
  }

  return insights;
}
