// Financial Health Score — a direct, purpose-built answer to "why is my
// score low": the lowest-scoring category's own negativeFactors, falling
// back to the top-level weaknesses list. Zero new scoring logic.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.financialHealthScore";
const MAX_RELATED_RECOMMENDATIONS = 3;

function lowestScoringCategory(categoryScores: CategoryScoreResult[]): CategoryScoreResult | null {
  const scored = categoryScores.filter((c): c is CategoryScoreResult & { score: number } => c.score !== null);
  if (scored.length === 0) return null;
  return scored.reduce((lowest, c) => (c.score < lowest.score ? c : lowest));
}

export function respondFinancialHealthScore(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { financialHealthScore } = data;
  const hasData = !financialHealthScore.insufficientData && financialHealthScore.overallScore !== null;

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { overallScore: Math.round(financialHealthScore.overallScore!), grade: financialHealthScore.grade ?? "-" } }
    : { key: `${NS}.noData`, params: {} };

  const lowest = hasData ? lowestScoringCategory(financialHealthScore.categoryScores) : null;
  const topNegativeFactor = lowest?.explanation.negativeFactors[0] ?? financialHealthScore.weaknesses[0] ?? null;
  const reason: CoachMessage = topNegativeFactor ?? { key: `${NS}.reasonNoWeakness`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasData ? { overallScore: financialHealthScore.overallScore! } : {};
  if (lowest) {
    supportingMetrics.lowestCategory = lowest.category;
    supportingMetrics.lowestCategoryScore = lowest.score!;
  }

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
