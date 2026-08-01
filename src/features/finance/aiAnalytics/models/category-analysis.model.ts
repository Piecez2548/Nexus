// Analytics domain model surface for Category Analysis — aliases the type
// categoryDetail.ts already owns, computed on demand per category (there's
// no "all categories at once" batch analyzer; the spec's field list is
// singular — one record, not a collection).

import { pctChange } from "@/features/finance/utils/cashFlowMath";
import { trendFromChangePercent, type Trend } from "@/features/finance/aiAnalytics/models/enums";
import type { CategoryDetailResult } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

export type {
  CategoryDetailResult as CategoryAnalysis,
  CategoryDetailRecommendation,
  CategoryDetailRecommendationKey,
  CategoryMonthlyTrendPoint,
  CategoryTopMerchant,
} from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

// categoryDetail.ts's own CategoryMonthlyTrendPoint[] carries the raw
// numbers already — this classifies the last two points into the shared
// Trend enum rather than storing a redundant field on CategoryDetailResult.
export function trendForCategory(detail: CategoryDetailResult): Trend {
  const { monthlyTrend } = detail;
  if (monthlyTrend.length < 2) return "stable";
  const current = monthlyTrend[monthlyTrend.length - 1].amount;
  const previous = monthlyTrend[monthlyTrend.length - 2].amount;
  return trendFromChangePercent(pctChange(current, previous));
}
