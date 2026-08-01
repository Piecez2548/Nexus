// The shared core behind Monthly/Weekly/Yearly Forecast — same
// day-elapsed/total-days linear extrapolation engine/analyzers/forecast.ts
// already uses for its monthly-only projection, generalized via
// getCurrentPeriodRange() (periodRange.ts already supports all three
// BudgetPeriod values). Also satisfies the spec's separate CASH FLOW
// FORECAST section (income/expenses/net/remaining balance/stability) —
// those are the same numbers this month-end-style projection already
// produces, not a distinct predictor; see cashFlowStabilityScore below.

import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { cumulativeBalanceAsOf, lastNMonthRanges, monthKey, sumByType } from "@/features/finance/utils/cashFlowMath";
import { toLocalDateString } from "@/utils/localDate";
import { signedCoefficientOfVariationScore } from "@/features/finance/aiAnalytics/engine/forecast/calculators/stabilityMath";
import { calculateForecastConfidence } from "@/features/finance/aiAnalytics/engine/forecast/calculators/forecastConfidenceCalculator";
import type { BudgetPeriod, Transaction } from "@/features/finance/types";
import type { PeriodForecast } from "@/features/finance/aiAnalytics/engine/forecast/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STABILITY_WINDOW_MONTHS = 6;
const STABILITY_MAX_COV = 0.6;

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Exported for reuse by estimators/budgetForecastEstimator.ts, which needs
// the identical day-elapsed/total-days math per budget (not just per
// PeriodForecast) — keeps the linear-projection date arithmetic in one
// place rather than duplicating it.
export function daysBetween(from: Date, to: Date): number {
  return Math.round((atMidnight(to).getTime() - atMidnight(from).getTime()) / MS_PER_DAY);
}

function projectForRestOfPeriod(soFar: number, daysElapsed: number, totalDays: number): number {
  return (soFar / daysElapsed) * totalDays;
}

// Only monthly/yearly periods align with the existing month-keyed
// cumulativeBalanceAsOf() primitive (yearly period boundaries fall exactly
// on a month boundary too — December of the previous year). There's no
// day-level equivalent for a weekly period, so weekly opts out rather than
// fabricating a mismatched-granularity figure.
function computeExpectedEndOfPeriodBalance(transactions: Transaction[], period: BudgetPeriod, rangeStart: Date, expectedSavings: number): number | null {
  if (period === "weekly") return null;

  const previousPeriodEndMonth = period === "yearly" ? new Date(rangeStart.getFullYear() - 1, 11, 1) : new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1);

  return cumulativeBalanceAsOf(transactions, monthKey(previousPeriodEndMonth)) + expectedSavings;
}

function computeCashFlowStabilityScore(transactions: Transaction[], now: Date): number | null {
  const netByMonth = lastNMonthRanges(STABILITY_WINDOW_MONTHS, now).map((m) => sumByType(transactions, "income", m.range) - sumByType(transactions, "expense", m.range));
  return signedCoefficientOfVariationScore(netByMonth, STABILITY_MAX_COV);
}

export function computePeriodForecast(transactions: Transaction[], period: BudgetPeriod, monthsOfHistory: number, insufficientData: boolean, now = new Date()): PeriodForecast {
  const range = getCurrentPeriodRange(period, now);
  const totalDays = daysBetween(range.start, range.end);
  const daysElapsed = Math.min(Math.max(daysBetween(range.start, now) + 1, 1), totalDays);

  const soFarRange = { start: range.start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) };
  const incomeSoFar = sumByType(transactions, "income", soFarRange);
  const expenseSoFar = sumByType(transactions, "expense", soFarRange);

  const expectedIncome = projectForRestOfPeriod(incomeSoFar, daysElapsed, totalDays);
  const expectedExpense = projectForRestOfPeriod(expenseSoFar, daysElapsed, totalDays);
  const expectedSavings = expectedIncome - expectedExpense;
  const cashFlowStabilityScore = computeCashFlowStabilityScore(transactions, now);

  return {
    period,
    rangeStart: toLocalDateString(range.start),
    rangeEnd: toLocalDateString(range.end),
    incomeSoFar,
    expenseSoFar,
    expectedIncome,
    expectedExpense,
    remainingExpectedExpense: Math.max(0, expectedExpense - expenseSoFar),
    expectedSavings,
    expectedEndOfPeriodBalance: computeExpectedEndOfPeriodBalance(transactions, period, range.start, expectedSavings),
    cashFlowStabilityScore,
    confidence: calculateForecastConfidence(monthsOfHistory, cashFlowStabilityScore, insufficientData),
    basis: cashFlowStabilityScore === null ? "insufficientData" : "linearProjection",
  };
}
