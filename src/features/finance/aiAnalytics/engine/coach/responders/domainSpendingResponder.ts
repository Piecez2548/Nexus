// Shared core behind restaurantResponder/coffeeResponder/shoppingResponder
// — all 3 read the identical DomainSpendingAnalysis shape (Prompt 007's
// behaviorProfile.profile.{food,coffee,shopping}Analysis), mirroring
// Prompt 007's own foodAnalyzer.ts/coffeeAnalyzer.ts thin-wrapper-over-
// shared-core pattern one layer up.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ActionableRecommendation, RecommendationCategory } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const MAX_RELATED_RECOMMENDATIONS = 3;

export interface DomainSpendingResponderConfig {
  domain: DomainSpendingAnalysis;
  answerKeyPrefix: string; // e.g. "aiAnalytics.aiCoach.answers.restaurantAnalysis"
  relatedCategories: readonly RecommendationCategory[];
  actionableRecommendations: ActionableRecommendation[];
}

export function buildDomainSpendingResponse(config: DomainSpendingResponderConfig): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { domain, answerKeyPrefix, relatedCategories, actionableRecommendations } = config;
  const hasData = domain.transactionCount > 0;

  const answer: CoachMessage = hasData
    ? { key: `${answerKeyPrefix}.hasData`, params: { totalSpent: Math.round(domain.totalSpent), transactionCount: domain.transactionCount, averagePerVisit: Math.round(domain.averagePerVisit) } }
    : { key: `${answerKeyPrefix}.noData`, params: {} };

  const reason: CoachMessage = hasData
    ? { key: `${answerKeyPrefix}.reason`, params: { averagePerDay: Math.round(domain.averagePerDay * 100) / 100, topMerchant: domain.topMerchant?.alias ?? "-" } }
    : { key: `${answerKeyPrefix}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = {
    totalSpent: domain.totalSpent,
    transactionCount: domain.transactionCount,
    averagePerVisit: Math.round(domain.averagePerVisit),
  };
  if (domain.topMerchant) supportingMetrics.topMerchant = domain.topMerchant.alias;

  const relatedRecommendations = actionableRecommendations.filter((r) => relatedCategories.includes(r.category)).slice(0, MAX_RELATED_RECOMMENDATIONS);

  return {
    answer,
    supportingMetrics,
    reason,
    confidence: computeAnswerConfidence({ hasData, sampleSize: domain.transactionCount }),
    relatedRecommendations,
  };
}
