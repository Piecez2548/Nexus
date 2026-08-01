// Barrel for the Recommendation Engine (Prompt 006) — an enrichment +
// prioritization layer over the existing Rule Engine (engine/rules/).
// generateActionableRecommendations() is the main synchronous entry point;
// localRecommendationEngine is the async RecommendationEngine-interface
// wrapper a future AI-provider-backed implementation can replace.

export * from "@/features/finance/aiAnalytics/engine/recommendation/types";
export * from "@/features/finance/aiAnalytics/engine/recommendation/calculators/categoryCalculator";
export * from "@/features/finance/aiAnalytics/engine/recommendation/calculators/confidenceCalculator";
export * from "@/features/finance/aiAnalytics/engine/recommendation/calculators/savingsEstimator";
export * from "@/features/finance/aiAnalytics/engine/recommendation/calculators/impactCalculator";
export * from "@/features/finance/aiAnalytics/engine/recommendation/calculators/difficultyCalculator";
export * from "@/features/finance/aiAnalytics/engine/recommendation/templates/suggestedActionsTemplate";
export * from "@/features/finance/aiAnalytics/engine/recommendation/generators/enrichRecommendation";
export * from "@/features/finance/aiAnalytics/engine/recommendation/prioritizers/prioritizeRecommendations";
export * from "@/features/finance/aiAnalytics/engine/recommendation/engine/generateActionableRecommendations";
export * from "@/features/finance/aiAnalytics/engine/recommendation/services/localRecommendationEngine";
