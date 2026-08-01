// Income Stability calculator — Regular Income (share of trailing months
// with any income), Income Growth (oldest vs newest month), Income
// Volatility (coefficient of variation) — averaged into one 0-100 score.
// Reuses multiMonthTrends.monthlyValuesFor (built in Prompt 003) rather than
// re-deriving its own month-bucketing.

import { monthlyValuesFor } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

const NS = "aiAnalytics.financialHealthScore.incomeStability";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateIncomeStabilityScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["incomeStability"]): CategoryScoreResult {
  const monthlyIncomes = monthlyValuesFor(context.transactions, null, "income", thresholds.windowMonths, context.now);
  const monthsWithIncome = monthlyIncomes.filter((v) => v > 0).length;

  if (monthsWithIncome === 0) {
    return {
      category: "incomeStability",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noIncome`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const mean = monthlyIncomes.reduce((sum, v) => sum + v, 0) / monthlyIncomes.length;
  const variance = monthlyIncomes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / monthlyIncomes.length;
  const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const volatilityScore = clamp(100 - (coefficientOfVariation / thresholds.maxCoefficientOfVariation) * 100, 0, 100);

  const regularityScore = (monthsWithIncome / monthlyIncomes.length) * 100;

  // Oldest vs newest month in the window, not month-over-month — a single
  // dip in an otherwise-growing trend shouldn't swing this the same way a
  // sustained decline does.
  const growthPercent = pctChange(monthlyIncomes[monthlyIncomes.length - 1], monthlyIncomes[0]);
  const growthScore = growthPercent === null ? null : clamp(50 + growthPercent, 0, 100);

  const components = [volatilityScore, regularityScore, growthScore].filter((s): s is number => s !== null);
  const score = components.reduce((sum, s) => sum + s, 0) / components.length;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  if (regularityScore === 100) {
    positiveFactors.push({ key: `${NS}.positive.regular`, params: {} });
  } else if (regularityScore < 50) {
    negativeFactors.push({ key: `${NS}.negative.irregular`, params: { months: monthsWithIncome, windowMonths: monthlyIncomes.length } });
  }

  if (volatilityScore < 50) {
    negativeFactors.push({ key: `${NS}.negative.volatile`, params: { coefficientOfVariation: Math.round(coefficientOfVariation * 100) } });
    improvementSuggestions.push({ key: `${NS}.suggestion.stabilize`, params: {} });
  }

  if (growthPercent !== null && growthPercent > 0) {
    positiveFactors.push({ key: `${NS}.positive.growing`, params: { percent: Math.round(growthPercent) } });
  } else if (growthPercent !== null && growthPercent < 0) {
    negativeFactors.push({ key: `${NS}.negative.declining`, params: { percent: Math.round(Math.abs(growthPercent)) } });
  }

  return {
    category: "incomeStability",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: { months: monthsWithIncome } }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
