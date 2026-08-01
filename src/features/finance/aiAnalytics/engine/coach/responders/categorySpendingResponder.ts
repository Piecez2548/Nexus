// Category Spending — batch-level lookup over spendingAnalysis.topCategories.
// Honesty path: a full per-category deep-dive (transaction list, top
// merchant) is NOT a FinancialAnalysisResult field — it lives only in the
// separate on-demand CategoryDetailResult/useCategoryDetail hook, which
// this pure function has no access to. The confidence ceiling reflects
// that the totals given ARE exact, just narrower than a "show me every
// transaction" question would want.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.categorySpending";
const CATEGORY_DEEP_DIVE_CEILING = 65;
const MAX_RELATED_RECOMMENDATIONS = 3;
const MAX_SUPPORTING_CATEGORIES = 5;

export function respondCategorySpending(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { spendingAnalysis } = data;
  const hasData = spendingAnalysis.topCategories.length > 0;
  const top = spendingAnalysis.topCategories[0] ?? null;

  const answer: CoachMessage = top
    ? { key: `${NS}.hasData`, params: { category: top.category, amount: Math.round(top.amount), percentOfTotal: Math.round(top.percentOfTotal) } }
    : { key: `${NS}.noData`, params: {} };

  // Always states the honesty-path limitation, regardless of data availability.
  const reason: CoachMessage = { key: `${NS}.reason`, params: {} };

  const supportingMetrics: Record<string, string | number> = {};
  spendingAnalysis.topCategories.slice(0, MAX_SUPPORTING_CATEGORIES).forEach((c) => {
    supportingMetrics[c.category] = c.amount;
  });

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData, ceiling: CATEGORY_DEEP_DIVE_CEILING }),
    relatedRecommendations: data.actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
