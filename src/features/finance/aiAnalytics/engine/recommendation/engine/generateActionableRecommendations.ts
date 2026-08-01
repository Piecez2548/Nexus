// Top-level entry point: enriches every Rule Engine finding into an
// ActionableRecommendation, then prioritizes the batch. Pure and
// synchronous — see services/localRecommendationEngine.ts for the async
// RecommendationEngine-interface wrapper future AI providers can replace.

import { enrichRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/generators/enrichRecommendation";
import { prioritizeRecommendations } from "@/features/finance/aiAnalytics/engine/recommendation/prioritizers/prioritizeRecommendations";
import type { ActionableRecommendation, RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";

export function generateActionableRecommendations(context: RecommendationEngineContext): ActionableRecommendation[] {
  const { recommendations, ...enrichmentContext } = context;
  const enriched = recommendations.map((rec) => enrichRecommendation(rec, enrichmentContext));

  return prioritizeRecommendations(enriched);
}
