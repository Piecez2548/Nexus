// Barrel for the Behavior Analysis Engine (Prompt 007) — a synthesis layer
// over the existing behaviorAnalysis.ts detectors, the Rule Engine, Prompt
// 005's scoring, Prompt 006's recommendations, and Prompt 004's models.
// analyzeBehaviorProfile() is the main synchronous entry point;
// localBehaviorEngine is the async BehaviorEngine-interface wrapper a
// future AI-provider-backed implementation can replace.

export * from "@/features/finance/aiAnalytics/engine/behavior/types";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/restaurantDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/coffeeDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/convenienceStoreDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/weekendDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/lateNightDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/impulseDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/shoppingDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/subscriptionDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/salaryDayDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/detectors/recurringExpenseDetector";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/foodAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/coffeeAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/transportAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/timeAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/merchantBehaviorAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/recurringPatternAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/analyzers/seasonalPatternAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/behavior/calculators/scoreMath";
export * from "@/features/finance/aiAnalytics/engine/behavior/calculators/spendingStyleClassifier";
export * from "@/features/finance/aiAnalytics/engine/behavior/calculators/behaviorScoreCalculator";
export * from "@/features/finance/aiAnalytics/engine/behavior/insights/aggregateHabits";
export * from "@/features/finance/aiAnalytics/engine/behavior/insights/behaviorInsightGenerator";
export * from "@/features/finance/aiAnalytics/engine/behavior/engine/analyzeBehaviorProfile";
export * from "@/features/finance/aiAnalytics/engine/behavior/services/localBehaviorEngine";
