// Analytics domain model surface for Behavior Analysis — aliases the types
// behaviorAnalysis.ts already owns and computes. See behaviorAnalysis.ts for
// analyzeBehavior(); nothing here recomputes it.

export type {
  BehaviorAnalysisResult as BehaviorAnalysis,
  BehaviorFlag,
  BehaviorFlagKey,
  LargePurchaseEntry,
  TopMerchantEntry,
  MerchantMonthlyTrendPoint,
  SubscriptionEntry,
  ImpulsePurchaseEntry,
  ImpulsePurchaseReason,
  MostActiveHourResult,
} from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
