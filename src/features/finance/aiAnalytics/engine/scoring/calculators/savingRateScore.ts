// Saving Rate calculator — spec's literal stepped bands (≥30%→100,
// 20-29%→85, 10-19%→60, <10%→25), reading cashFlowAnalysis.savingRatePercent
// (this month). Bands are configurable via ScoreThresholds.savingRate.

import type { CategoryScoreResult, ScoreContext, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ScoreThresholds } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

const NS = "aiAnalytics.financialHealthScore.savingRate";

function scoreForSavingRate(savingRatePercent: number, thresholds: ScoreThresholds["savingRate"]): number {
  for (const band of thresholds.bands) {
    if (savingRatePercent >= band.minPercent) return band.score;
  }
  return thresholds.belowScore;
}

export function calculateSavingRateScore(context: ScoreContext, weight: number, thresholds: ScoreThresholds["savingRate"]): CategoryScoreResult {
  const { savingRatePercent } = context.cashFlowAnalysis;

  if (savingRatePercent === null) {
    return {
      category: "savingRate",
      score: null,
      weight,
      explanation: { reason: { key: `${NS}.reason.noIncome`, params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    };
  }

  const score = scoreForSavingRate(savingRatePercent, thresholds);
  const percent = Math.round(savingRatePercent);

  const positiveFactors: ScoreMessage[] = [];
  const negativeFactors: ScoreMessage[] = [];
  const improvementSuggestions: ScoreMessage[] = [];

  const topBandScore = thresholds.bands[0]?.score ?? 100;
  if (score >= topBandScore) {
    positiveFactors.push({ key: `${NS}.positive.strong`, params: { percent } });
  } else if (score <= thresholds.belowScore) {
    negativeFactors.push({ key: `${NS}.negative.low`, params: { percent } });
    improvementSuggestions.push({ key: `${NS}.suggestion.increase`, params: { percent } });
  } else {
    improvementSuggestions.push({ key: `${NS}.suggestion.grow`, params: { percent } });
  }

  return {
    category: "savingRate",
    score,
    weight,
    explanation: { reason: { key: `${NS}.reason.hasData`, params: { percent } }, positiveFactors, negativeFactors, improvementSuggestions },
  };
}
