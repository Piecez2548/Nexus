// The local, deterministic BehaviorEngine implementation —
// analyzeBehaviorProfile() computes synchronously, wrapped in a resolved
// Promise so a future Claude/OpenAI/Gemini/Ollama-backed implementation
// can satisfy BehaviorEngine with zero changes to any call site, exactly
// like localStatisticalEngine.ts's own FinancialIntelligenceEngine seam
// and the Recommendation Engine's localRecommendationEngine.

import { analyzeBehaviorProfile } from "@/features/finance/aiAnalytics/engine/behavior/engine/analyzeBehaviorProfile";
import type { BehaviorEngine } from "@/features/finance/aiAnalytics/engine/behavior/types";

export const localBehaviorEngine: BehaviorEngine = {
  analyze: (context) => Promise.resolve(analyzeBehaviorProfile(context)),
};
