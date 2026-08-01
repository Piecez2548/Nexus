// Analytics domain model surface for Recommendation — aliases the types
// recommendations.ts / the rule registry already own and compute. See
// engine/rules/registry.ts's runRules(); nothing here recomputes it.
//
// Two spec fields are deliberately not added here:
// - "Rule ID" — Recommendation.id already *is* the producing rule's own id
//   (every rule file sets its recommendation's id to match rule.id). Adding
//   a second, always-equal `ruleId` field would just be a redundant copy.
// - "Created Time" — recommendations are recomputed fresh on every
//   analysis run, not persisted with individual per-item timestamps. The
//   batch-level timestamp is FinancialAnalysisResult.meta.generatedAt,
//   shared by every recommendation in that run — inventing a fake per-item
//   value here would be less honest than pointing at the real one.

export type {
  Recommendation,
  RecommendationPriority,
  RecommendationConfidence,
  RecommendationMessage,
} from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
