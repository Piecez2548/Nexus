import { computePeriodForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
import type { Transaction } from "@/features/finance/types";

export function computeYearlyForecast(transactions: Transaction[], monthsOfHistory: number, insufficientData: boolean, now = new Date()) {
  return computePeriodForecast(transactions, "yearly", monthsOfHistory, insufficientData, now);
}
