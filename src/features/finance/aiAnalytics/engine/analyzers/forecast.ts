import { cumulativeBalanceAsOf, lastNMonthRanges, monthKey, sumByType } from "@/features/finance/utils/cashFlowMath";
import { computeMonthsOfHistory } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { Transaction } from "@/features/finance/types";

const TREND_WINDOW_MONTHS = 3;
const MIN_MONTHS_FOR_TREND = 2;

export interface BudgetOverflowRiskEntry {
  category: string;
  projectedSpend: number;
  // Raw, unclamped projected utilization at this pace — can exceed 100.
  projectedPercentage: number;
}

export interface ForecastResult {
  // Linear extrapolation only — explicitly not a predictive model. Assumes
  // this month's income/expense continue at their current daily pace for
  // the rest of the month.
  expectedEndOfMonthBalance: number;
  expectedSavings: number;
  // Budgets that are still "ok"/"near" today but are on pace to bust by
  // period-end — a forward-looking signal budgetAnalysis.ts doesn't carry,
  // since that only reports where a budget stands *right now*. Scoped to
  // monthly-period budgets only (v1 simplification — weekly/yearly budgets
  // have a different "days elapsed in period" calculation this doesn't do).
  budgetOverflowRisk: BudgetOverflowRiskEntry[];
  futureCashFlowTrend: {
    basis: "insufficientData" | "linearProjection";
    projectedMonthlyNet: number | null;
  };
}

function daysInMonth(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

// Transactions dated on or before `now`'s calendar date, within the
// current month — the "so far" figure a linear projection extrapolates
// from.
function monthToDateRange(now: Date) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayAfterNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: monthStart, end: dayAfterNow };
}

function projectForRestOfMonth(soFar: number, daysElapsed: number, totalDays: number): number {
  return (soFar / daysElapsed) * totalDays;
}

function computeBudgetOverflowRisk(budgetProgress: BudgetProgress[], daysElapsed: number, totalDays: number): BudgetOverflowRiskEntry[] {
  const risks: BudgetOverflowRiskEntry[] = [];

  for (const entry of budgetProgress) {
    if (entry.status === "over" || entry.budget.period !== "monthly" || entry.budget.amount <= 0) continue;

    const projectedSpend = projectForRestOfMonth(entry.spent, daysElapsed, totalDays);
    const projectedPercentage = (projectedSpend / entry.budget.amount) * 100;
    if (projectedPercentage >= 100) {
      risks.push({ category: entry.budget.category, projectedSpend, projectedPercentage });
    }
  }

  return risks;
}

function computeFutureCashFlowTrend(transactions: Transaction[], now: Date): ForecastResult["futureCashFlowTrend"] {
  const monthsOfHistory = computeMonthsOfHistory(transactions, now, TREND_WINDOW_MONTHS);
  if (monthsOfHistory < MIN_MONTHS_FOR_TREND) {
    return { basis: "insufficientData", projectedMonthlyNet: null };
  }

  const months = lastNMonthRanges(monthsOfHistory, now);
  const netByMonth = months.map((m) => sumByType(transactions, "income", m.range) - sumByType(transactions, "expense", m.range));
  const projectedMonthlyNet = netByMonth.reduce((sum, n) => sum + n, 0) / netByMonth.length;

  return { basis: "linearProjection", projectedMonthlyNet };
}

export function generateForecast(transactions: Transaction[], budgetProgress: BudgetProgress[], now = new Date()): ForecastResult {
  const daysElapsed = Math.max(now.getDate(), 1);
  const totalDays = daysInMonth(now);

  const soFarRange = monthToDateRange(now);
  const incomeSoFar = sumByType(transactions, "income", soFarRange);
  const expenseSoFar = sumByType(transactions, "expense", soFarRange);

  const projectedIncome = projectForRestOfMonth(incomeSoFar, daysElapsed, totalDays);
  const projectedExpense = projectForRestOfMonth(expenseSoFar, daysElapsed, totalDays);
  const expectedSavings = projectedIncome - projectedExpense;

  const previousMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const previousBalance = cumulativeBalanceAsOf(transactions, previousMonthKey);

  return {
    expectedEndOfMonthBalance: previousBalance + expectedSavings,
    expectedSavings,
    budgetOverflowRisk: computeBudgetOverflowRisk(budgetProgress, daysElapsed, totalDays),
    futureCashFlowTrend: computeFutureCashFlowTrend(transactions, now),
  };
}
