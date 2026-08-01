import { computePeriodForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
import type { Transaction } from "@/features/finance/types";

export function computeWeeklyForecast(transactions: Transaction[], monthsOfHistory: number, insufficientData: boolean, now = new Date()) {
  return computePeriodForecast(transactions, "weekly", monthsOfHistory, insufficientData, now);
}
