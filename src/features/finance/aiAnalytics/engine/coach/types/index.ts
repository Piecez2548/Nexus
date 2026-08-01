// AI Coach — Local Financial Copilot (Prompt 010). Unlike every prior
// engine (004-009), this is NOT a batch-compute layer: it adds zero new
// fields to FinancialAnalysisResult. It's an on-demand query function —
// classify a free-text question into one of 16 intents (rule-based
// keyword matching, no ML), then answer it entirely from
// FinancialAnalysisResult's already-computed fields. Never fabricates: if
// the data can't support a claim, the response says so.
//
// See engine/coach/index.ts for the public barrel and engine/askCoach.ts
// for the main entry point (computeCoachResponse).

import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

export type CoachIntent =
  | "financialOverview"
  | "expenseAnalysis"
  | "incomeAnalysis"
  | "budgetStatus"
  | "savingsProgress"
  | "cashFlow"
  | "financialHealthScore"
  | "categorySpending"
  | "merchantSpending"
  | "restaurantAnalysis"
  | "coffeeAnalysis"
  | "shoppingAnalysis"
  | "forecast"
  | "goalProgress"
  | "recommendations"
  | "behaviorAnalysis";

// "unknown" is a real, first-class outcome — not an error — for a question
// that matches no intent's keywords at all.
export type ClassifiedIntent = CoachIntent | "unknown";

export interface IntentMatch {
  intent: ClassifiedIntent;
  score: number; // sum of matched keyword string lengths, 0 for "unknown"
  confidence: number; // 0-100, the classifier's own certainty — a separate axis from the eventual answer's confidence
  matchedKeywords: string[];
  wasTieBroken: boolean; // true only when the top score was shared by >1 intent, resolved via INTENT_PRIORITY_ORDER
}

// {key, params} only, resolved via t(key, params) at render time — matches
// every other engine's own message convention. `key` is always fully
// qualified by the time a responder builds it, never a suffix concatenated
// later at render time.
export interface CoachMessage {
  key: string;
  params: Record<string, string | number>;
}

export interface CoachSuggestion {
  intent: CoachIntent;
  prompt: CoachMessage; // a canned, translated example question for this intent — clickable/resubmittable, never fabricated
}

export interface CoachResponse {
  intent: ClassifiedIntent;
  answer: CoachMessage;
  supportingMetrics: Record<string, string | number>;
  reason: CoachMessage;
  confidence: number; // 0-100
  // 0-3, sliced from the already-priority-sorted actionableRecommendations — never re-sorted.
  relatedRecommendations: ActionableRecommendation[];
  nextSuggestedQuestion: CoachSuggestion | null; // null only for "unknown"
}

export interface CoachEngineContext {
  data: FinancialAnalysisResult;
  questionText: string;
}

// A responder answers ONE intent from already-computed data. It never sets
// `intent`/`nextSuggestedQuestion` itself — the orchestrator
// (engine/askCoach.ts) attaches both centrally from the registry key, so
// an intent literal can never typo-drift between a responder and the
// registry that dispatches to it.
export type CoachResponder = (data: FinancialAnalysisResult) => Omit<CoachResponse, "intent" | "nextSuggestedQuestion">;

// The future-AI seam, mirroring ForecastEngine/BehaviorEngine/
// ExecutiveSummaryEngine — ask() returns a Promise even though the local
// implementation computes synchronously, so a future Claude/OpenAI/Gemini/
// Ollama-backed implementation can satisfy this same interface with zero
// changes to any call site. The UI itself calls the synchronous
// computeCoachResponse() directly (see engine/askCoach.ts) — this
// interface exists purely for that future swap, not today's call path.
export interface CoachEngine {
  ask(context: CoachEngineContext): Promise<CoachResponse>;
}
