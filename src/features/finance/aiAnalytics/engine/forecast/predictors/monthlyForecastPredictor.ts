import { computePeriodForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
import type { Transaction } from "@/features/finance/types";

export function computeMonthlyForecast(transactions: Transaction[], monthsOfHistory: number, insufficientData: boolean, now = new Date()) {
  return computePeriodForecast(transactions, "monthly", monthsOfHistory, insufficientData, now);
}
