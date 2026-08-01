// Shared enum-shaped types for the analytics domain model (Prompt 004).
// String unions, not TypeScript `enum` — matches every other type in this
// engine (RecommendationPriority, HealthScoreGrade, etc.), which are all
// string unions for structural typing and easy serialization.

import type { BudgetSpendResult } from "@/features/finance/utils/budgetStatus";

export type { RecommendationPriority as Priority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
export type { RuleCategory as RecommendationCategory } from "@/features/finance/aiAnalytics/engine/rules/types";
export type { BehaviorFlagKey as BehaviorType } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

// Matches AiInsight.severity today — TimelineEvent has no stored severity
// field, see timeline.model.ts's severityForTimelineEvent() for how a
// Timeline entry's severity is derived instead of stored.
export type Severity = "info" | "warning";

// Not produced anywhere yet — new for this model layer. See
// category-analysis.model.ts's trendForCategory() and
// merchant-analysis.model.ts's monthlyGrowthPercent for how it's derived
// from existing monthly trend data.
export type Trend = "increasing" | "decreasing" | "stable";

// Colocated with Trend (mirrors healthScore.ts's gradeForScore sitting next
// to HealthScoreGrade) — shared by category-analysis.model.ts and
// merchant-analysis.model.ts so both classify a month-over-month change the
// same way instead of each re-deriving their own flat-band threshold.
export function trendFromChangePercent(changePercent: number | null): Trend {
  if (changePercent === null || changePercent === 0) return "stable";
  return changePercent > 0 ? "increasing" : "decreasing";
}

// Aliased from utils/budgetStatus.ts's BudgetSpendResult["status"] via
// indexed access rather than redeclared, so the two can never drift apart.
export type BudgetStatus = BudgetSpendResult["status"];

// AiInsightKey has no stored category today — see insight.model.ts's
// categoryForInsight() for the lookup table that derives one of these from
// an insight's key.
export type InsightCategory = "spending" | "budget" | "cashFlow" | "behavior" | "forecast";
