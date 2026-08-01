// Recommendation Engine (Prompt 006) — an enrichment + prioritization layer
// over the existing Rule Engine (engine/rules/), not a replacement for it.
// See engine/recommendation/index.ts for the public barrel and
// generateActionableRecommendations() for the main entry point.

import type { Recommendation, RecommendationPriority, RecommendationMessage } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

export type RecommendationCategory =
  | "food"
  | "restaurant"
  | "coffee"
  | "shopping"
  | "transport"
  | "entertainment"
  | "subscriptions"
  | "budget"
  | "saving"
  | "income"
  | "investment"
  | "cashFlow"
  | "goals"
  | "general";

export type Difficulty = "easy" | "moderate" | "hard";

// Derived from Difficulty (see difficultyCalculator.ts's
// expectedCompletionTimeFor()) rather than a second independent estimate —
// a deliberate simplification, not a full separate timeline model.
export type ExpectedCompletionTime = "immediate" | "thisMonth" | "within3Months";

export interface SuggestedActions {
  immediate: RecommendationMessage;
  weekly: RecommendationMessage;
  monthly: RecommendationMessage;
  longTerm: RecommendationMessage;
}

export interface ImpactEstimate {
  monthlySavings: number;
  annualSavings: number;
  // Null when this recommendation isn't tied to a specific over-budget
  // category (most rules aren't) — never a fabricated 0.
  budgetImprovementPercent: number | null;
  // A cheap, honest proxy for "Financial Health Improvement": the
  // percentage-point saving-rate gain this recommendation's savings would
  // represent, not a full re-run of the Prompt 005 scoring engine against a
  // hypothetical future. Null when there's no income to measure a rate
  // against.
  savingRateImprovementPercent: number | null;
}

export interface ActionableRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: RecommendationMessage;
  // summary and reason intentionally share the same content (the rule's
  // own `reason` message) — see engine/recommendation/generators/
  // enrichRecommendation.ts for why. description reuses the rule's
  // `action` message instead.
  summary: RecommendationMessage;
  description: RecommendationMessage;
  reason: RecommendationMessage;
  supportingMetrics: Record<string, string | number>;
  confidence: number; // 0-100
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  estimatedFinancialImpact: ImpactEstimate;
  difficulty: Difficulty;
  expectedCompletionTime: ExpectedCompletionTime;
  suggestedActions: SuggestedActions;
  // The originating rule's key — always exactly one entry today, since
  // this design enriches one rule finding at a time rather than merging
  // several into a single recommendation.
  relatedRules: string[];
  createdTime: string; // ISO — the batch-level analysis run timestamp
}

// Everything enrichRecommendation()/generateActionableRecommendations()
// need, drawn from analyzers and models earlier prompts already built —
// no new statistics computed here, only richer packaging of what exists.
// Deliberately excludes FinancialSnapshot: every number it carries
// (income, expense, category/merchant totals) is already reachable through
// cashFlowAnalysis/budgetAnalysis/merchantAnalysis below, so including it
// too would just be a second, unused way to reach the same data.
export interface RecommendationEngineContext {
  recommendations: Recommendation[];
  financialHealthScore: FinancialHealthScoreResult;
  merchantAnalysis: MerchantAnalysis[];
  budgetAnalysis: BudgetAnalysisResult;
  cashFlowAnalysis: CashFlowAnalysisResult;
  monthsOfHistory: number;
  now: Date;
}

// The future-AI seam, mirroring FinancialIntelligenceEngine
// (aiAnalytics/types.ts) — analyze() there and generate() here both return
// a Promise even though the local implementation computes synchronously,
// so a future Claude/OpenAI/Gemini/Ollama-backed implementation can
// satisfy this same interface with zero changes to any call site.
export interface RecommendationEngine {
  generate(context: RecommendationEngineContext): Promise<ActionableRecommendation[]>;
}
