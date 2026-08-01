import { lastNMonthRanges, pctChange, sumByType } from "@/features/finance/utils/cashFlowMath";
import type { Transaction } from "@/features/finance/types";

export interface CashFlowMonthPoint {
  monthKey: string;
  income: number;
  expense: number;
  saving: number;
  savingRatePercent: number | null;
  netCashFlow: number;
}

export interface CashFlowAnalysisResult {
  income: number;
  expense: number;
  saving: number;
  savingRatePercent: number | null;
  netCashFlow: number;
  changeVsPreviousMonth: {
    income: number | null;
    expense: number | null;
    saving: number | null;
  };
  monthlyTrend: CashFlowMonthPoint[];
}

const TREND_WINDOW_MONTHS = 6;

function monthPoint(transactions: Transaction[], monthKey: string, range: { start: Date; end: Date }): CashFlowMonthPoint {
  const income = sumByType(transactions, "income", range);
  const expense = sumByType(transactions, "expense", range);
  const saving = income - expense;
  return {
    monthKey,
    income,
    expense,
    saving,
    savingRatePercent: income > 0 ? (saving / income) * 100 : null,
    netCashFlow: saving,
  };
}

export function analyzeCashFlow(transactions: Transaction[], now = new Date()): CashFlowAnalysisResult {
  const months = lastNMonthRanges(TREND_WINDOW_MONTHS, now);
  const monthlyTrend = months.map((m) => monthPoint(transactions, m.monthKey, m.range));

  const current = monthlyTrend[monthlyTrend.length - 1];
  const previous = monthlyTrend[monthlyTrend.length - 2];

  return {
    income: current.income,
    expense: current.expense,
    saving: current.saving,
    savingRatePercent: current.savingRatePercent,
    netCashFlow: current.netCashFlow,
    changeVsPreviousMonth: {
      income: pctChange(current.income, previous.income),
      expense: pctChange(current.expense, previous.expense),
      saving: pctChange(current.saving, previous.saving),
    },
    monthlyTrend,
  };
}
