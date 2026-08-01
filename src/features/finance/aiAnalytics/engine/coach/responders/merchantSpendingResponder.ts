// Merchant Spending — merchantAnalysis (Prompt 004) for $ figures,
// behaviorProfile.profile.merchantBehavior (Prompt 007) for the "favorite
// merchant" behavioral framing. Zero new computation; finds the top
// merchant by reduce rather than assuming array order, even though
// buildMerchantAnalysis's own "topMerchants" naming implies it already is.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.merchantSpending";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondMerchantSpending(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { merchantAnalysis, behaviorProfile } = data;
  const hasData = merchantAnalysis.length > 0;
  const top = hasData ? merchantAnalysis.reduce((max, m) => (m.totalSpending > max.totalSpending ? m : max)) : null;
  const favorite = behaviorProfile.profile.merchantBehavior.find((m) => m.isFavorite) ?? null;

  const answer: CoachMessage = top
    ? { key: `${NS}.hasData`, params: { alias: top.alias, totalSpending: Math.round(top.totalSpending), frequency: top.frequency } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage =
    favorite && favorite.alias !== top?.alias
      ? { key: `${NS}.reasonFavorite`, params: { favoriteAlias: favorite.alias, loyaltyMonthsActive: favorite.loyaltyMonthsActive } }
      : top
        ? { key: `${NS}.reasonTopSpend`, params: { averagePurchase: Math.round(top.averagePurchase) } }
        : { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = top ? { alias: top.alias, totalSpending: top.totalSpending, frequency: top.frequency, averagePurchase: top.averagePurchase } : {};
  if (favorite) supportingMetrics.favoriteAlias = favorite.alias;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.filter((r) => r.category === "shopping" || r.category === "restaurant" || r.category === "food").slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
