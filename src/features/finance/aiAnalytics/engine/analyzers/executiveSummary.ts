import type { HealthScoreResult } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

export type ExecutiveSummaryPartKey =
  | "overallHealth"
  | "topCategoryTrendUp"
  | "topCategoryTrendDown"
  | "topCategoryTrendFlat"
  | "savingRate"
  | "topRecommendation";

export interface ExecutiveSummaryPart {
  key: ExecutiveSummaryPartKey;
  params: Record<string, string | number>;
}

// Each part is included only if its underlying data exists — a brand-new
// profile with no history yet gets an empty array, not parts built from
// zeros/nulls that would read as false claims ("your saving rate is 0%").
export function generateExecutiveSummary(
  healthScore: HealthScoreResult,
  spendingAnalysis: SpendingAnalysisResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  recommendations: Recommendation[]
): ExecutiveSummaryPart[] {
  const parts: ExecutiveSummaryPart[] = [];

  if (healthScore.score !== null && healthScore.grade !== null) {
    parts.push({ key: "overallHealth", params: { score: Math.round(healthScore.score), grade: healthScore.grade } });
  }

  const [topCategory] = spendingAnalysis.topCategories;
  if (topCategory) {
    const comparison = spendingAnalysis.categoryComparison.find((c) => c.category === topCategory.category);
    const changePercent = comparison?.changePercent ?? null;
    const trendKey: ExecutiveSummaryPartKey = changePercent === null || changePercent === 0 ? "topCategoryTrendFlat" : changePercent > 0 ? "topCategoryTrendUp" : "topCategoryTrendDown";

    parts.push({
      key: trendKey,
      params: { category: topCategory.category, amount: topCategory.amount, percent: changePercent === null ? 0 : Math.round(Math.abs(changePercent)) },
    });
  }

  if (cashFlowAnalysis.savingRatePercent !== null) {
    parts.push({ key: "savingRate", params: { percent: Math.round(cashFlowAnalysis.savingRatePercent) } });
  }

  // Only the estimated savings figure, not the recommendation's own
  // category/behavior identity — re-deriving RecommendationsSection's
  // per-key message-selection logic here would duplicate it for no reason.
  const [topRecommendation] = recommendations;
  if (topRecommendation) {
    parts.push({ key: "topRecommendation", params: { amount: topRecommendation.estimatedMonthlySavings } });
  }

  return parts;
}
