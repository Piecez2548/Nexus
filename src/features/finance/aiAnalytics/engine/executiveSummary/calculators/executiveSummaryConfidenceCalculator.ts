// A weighted blend of already-computed confidences, mirroring the "named
// constants, clamp 0-100" shape of engine/recommendation/calculators/
// confidenceCalculator.ts and engine/forecast/calculators/
// forecastConfidenceCalculator.ts. Prompt 005's FinancialHealthScoreResult
// has no numeric confidence of its own (only the boolean insufficientData),
// so its contribution here is a data-COMPLETENESS proxy — how many of the
// 7 score categories were actually computable — deliberately independent
// of the score's own magnitude, matching every other confidence calculator
// in this app keeping "how good" separate from "how sure".

import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

const BEHAVIOR_WEIGHT = 0.3;
const FORECAST_WEIGHT = 0.3;
const HEALTH_SCORE_WEIGHT = 0.4; // weights sum to 1.0

const INSUFFICIENT_DATA_PENALTY = 15;

function healthScoreConfidence(financialHealthScore: FinancialHealthScoreResult): number {
  const { categoryScores } = financialHealthScore;
  if (categoryScores.length === 0) return 0;
  const scored = categoryScores.filter((c) => c.score !== null).length;
  return (scored / categoryScores.length) * 100;
}

export function calculateExecutiveSummaryConfidence(behaviorConfidence: number, forecastConfidence: number, financialHealthScore: FinancialHealthScoreResult): number {
  const blended = behaviorConfidence * BEHAVIOR_WEIGHT + forecastConfidence * FORECAST_WEIGHT + healthScoreConfidence(financialHealthScore) * HEALTH_SCORE_WEIGHT;
  const adjustment = financialHealthScore.insufficientData ? -INSUFFICIENT_DATA_PENALTY : 0;

  return clamp(Math.round(blended + adjustment), 0, 100);
}
