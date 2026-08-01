// The local, deterministic RecommendationEngine implementation —
// generateActionableRecommendations() computes synchronously, wrapped in a
// resolved Promise so a future Claude/OpenAI/Gemini/Ollama-backed
// implementation can satisfy RecommendationEngine with zero changes to any
// call site, exactly like localStatisticalEngine.ts's own
// FinancialIntelligenceEngine seam.

import { generateActionableRecommendations } from "@/features/finance/aiAnalytics/engine/recommendation/engine/generateActionableRecommendations";
import type { RecommendationEngine } from "@/features/finance/aiAnalytics/engine/recommendation/types";

export const localRecommendationEngine: RecommendationEngine = {
  generate: (context) => Promise.resolve(generateActionableRecommendations(context)),
};
