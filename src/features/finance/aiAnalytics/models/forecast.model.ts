// Analytics domain model surface for Forecast — aliases the type
// forecast.ts already owns and computes. See forecast.ts for
// generateForecast(); nothing here recomputes it.

import type { RecommendationConfidence } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";

export type { ForecastResult as Forecast, BudgetOverflowRiskEntry } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";

// ForecastResult has no stored confidence field — this derives one from
// futureCashFlowTrend.basis (the only signal forecast.ts carries about how
// much history backs the projection) using the same "high"/"medium"/"low"
// vocabulary as Recommendation.confidence, rather than a separate scale.
export function forecastConfidence(forecast: ForecastResult): RecommendationConfidence {
  return forecast.futureCashFlowTrend.basis === "linearProjection" ? "medium" : "low";
}
