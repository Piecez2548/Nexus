// Cash Flow calculator — Positive Cash Flow (this month), Monthly Trend
// (share of the trailing window with non-negative cash flow, via
// multiMonthTrends.trailingConsecutiveCount), Cash Stability (coefficient of
// variation across the trailing window) — averaged into one 0-100 score.
// Reuses cashFlowAnalysis.monthlyTrend verbatim rather than recomputing a
// second monthly series.

import { trailingConsecutiveCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

const NS = "aiAnalytics.financialHealthScore.cashFlow";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateCashFlowScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["cashFlow"]): CategoryScoreResult {
  const { netCashFlow, expense, monthlyTrend } = context.cashFlowAnalysis;

  // A window with zero income and zero expense in every month (a brand-new
  // profile) trivially "passes" every sub-check below (0 >= 0, no negative
  // months, no variance) — without this guard it would score a perfect 100
  // for having no data at all, exactly the false-positive this engine's
  // insufficientData convention exists to avoid everywhere else.
  if (monthlyTrend.every((m) => m.income === 0 && m.expense === 0)) {
    return {
      category: "cashFlow",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noData`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const positiveCashFlowScore = netCashFlow >= 0 ? 100 : clamp(100 + (expense > 0 ? (netCashFlow / expense) * 100 : -100), 0, 100);

  const netValues = monthlyTrend.map((m) => m.netCashFlow);
  const consecutiveNonNegative = trailingConsecutiveCount(netValues, (v) => v >= 0);
  const monthlyTrendScore = (consecutiveNonNegative / netValues.length) * 100;

  const mean = netValues.reduce((sum, v) => sum + v, 0) / netValues.length;
  const variance = netValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / netValues.length;
  const absMean = Math.abs(mean);
  const coefficientOfVariation = absMean > 0 ? Math.sqrt(variance) / absMean : variance > 0 ? 1 : 0;
  const stabilityScore = clamp(100 - (coefficientOfVariation / thresholds.volatilityMaxCoV) * 100, 0, 100);

  const score = (positiveCashFlowScore + monthlyTrendScore + stabilityScore) / 3;

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  if (netCashFlow >= 0) {
    positiveFactors.push({ key: `${NS}.positive.positiveCashFlow`, params: { amount: Math.round(netCashFlow) } });
  } else {
    negativeFactors.push({ key: `${NS}.negative.negativeCashFlow`, params: { amount: Math.round(Math.abs(netCashFlow)) } });
    improvementSuggestions.push({ key: `${NS}.suggestion.reduceExpense`, params: {} });
  }

  if (monthlyTrendScore === 100) {
    positiveFactors.push({ key: `${NS}.positive.consistentlyPositive`, params: { months: netValues.length } });
  } else if (monthlyTrendScore < 50) {
    negativeFactors.push({ key: `${NS}.negative.frequentlyNegative`, params: { months: netValues.length - consecutiveNonNegative } });
  }

  if (stabilityScore < 50) {
    negativeFactors.push({ key: `${NS}.negative.unstable`, params: {} });
    improvementSuggestions.push({ key: `${NS}.suggestion.stabilizeCashFlow`, params: {} });
  }

  return {
    category: "cashFlow",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: { netCashFlow: Math.round(netCashFlow) } }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
