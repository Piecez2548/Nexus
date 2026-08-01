// Pure aggregation of every category's already-built explanation into the
// spec's 5 overall output buckets, by score band — mirrors Prompt 004's
// Summary model (reuse already-built messages, invent zero new ones at the
// orchestrator level). Categories with a null score (not enough data) are
// excluded from every bucket, not treated as a 0.

import type { CategoryScoreResult, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";

export interface AggregatedExplanations {
  strengths: ScoreMessage[];
  weaknesses: ScoreMessage[];
  warnings: ScoreMessage[];
  recommendations: ScoreMessage[];
  improvementOpportunities: ScoreMessage[];
}

const STRONG_THRESHOLD = 80;
const WEAK_THRESHOLD = 60;
const CRITICAL_THRESHOLD = 40;
const NEAR_PERFECT_THRESHOLD = 90;

export function aggregateExplanations(categoryScores: CategoryScoreResult[]): AggregatedExplanations {
  const scored = categoryScores.filter((c): c is CategoryScoreResult & { score: number } => c.score !== null);

  return {
    strengths: scored.filter((c) => c.score >= STRONG_THRESHOLD).flatMap((c) => c.explanation.positiveFactors),
    weaknesses: scored.filter((c) => c.score >= CRITICAL_THRESHOLD && c.score < WEAK_THRESHOLD).flatMap((c) => c.explanation.negativeFactors),
    warnings: scored.filter((c) => c.score < CRITICAL_THRESHOLD).flatMap((c) => c.explanation.negativeFactors),
    recommendations: scored.filter((c) => c.score < WEAK_THRESHOLD).flatMap((c) => c.explanation.improvementSuggestions),
    improvementOpportunities: scored.filter((c) => c.score >= WEAK_THRESHOLD && c.score < NEAR_PERFECT_THRESHOLD).flatMap((c) => c.explanation.improvementSuggestions),
  };
}
