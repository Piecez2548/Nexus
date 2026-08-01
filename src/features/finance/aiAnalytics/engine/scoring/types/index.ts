// Financial Health Scoring System (Prompt 005) — a new, independent scoring
// engine alongside the existing engine/analyzers/healthScore.ts (untouched).
// See engine/scoring/index.ts for the public barrel.

import type { Transaction, Budget } from "@/features/finance/types";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";

export type ScoreCategory = "savingRate" | "budgetDiscipline" | "expenseControl" | "cashFlow" | "incomeStability" | "behavior" | "goalProgress";

// {key, params} only, resolved via t(key, params) at render time — matches
// every other engine output in this app (Recommendation, AiInsight,
// TimelineEvent); never a pre-formatted string baked into the engine.
export interface ScoreMessage {
  key: string;
  params: Record<string, string | number>;
}

export interface CategoryExplanation {
  reason: ScoreMessage;
  positiveFactors: ScoreMessage[];
  negativeFactors: ScoreMessage[];
  improvementSuggestions: ScoreMessage[];
}

export interface CategoryScoreResult {
  category: ScoreCategory;
  // null when there isn't enough data to score this category at all (e.g.
  // no goals yet, or no income this period) — excluded from the weighted
  // average and renormalized, never counted as a 0.
  score: number | null;
  // The category's configured weight (0-100), for display and for the
  // orchestrator's renormalization — not the score itself.
  weight: number;
  explanation: CategoryExplanation;
}

export type FinancialHealthGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
export type FinancialHealthStatus = "excellent" | "outstanding" | "veryGood" | "good" | "fair" | "poor" | "critical";

export interface FinancialHealthScoreResult {
  overallScore: number | null;
  grade: FinancialHealthGrade | null;
  status: FinancialHealthStatus | null;
  insufficientData: boolean;
  categoryScores: CategoryScoreResult[];
  // Pure aggregations of categoryScores[].explanation by score band — see
  // explanations/aggregateExplanations.ts. No new messages are invented at
  // this level.
  strengths: ScoreMessage[];
  weaknesses: ScoreMessage[];
  warnings: ScoreMessage[];
  recommendations: ScoreMessage[];
  improvementOpportunities: ScoreMessage[];
}

// Everything a calculator might need — a dedicated type, not a reuse of the
// Rule Engine's RuleContext (engine/rules/types.ts): these are two
// independent subsystems per the spec's own architecture, and RuleContext
// carries fields scoring never needs (forecast, recipientProfiles, healthScore).
export interface ScoreContext {
  cashFlowAnalysis: CashFlowAnalysisResult;
  budgetAnalysis: BudgetAnalysisResult;
  spendingAnalysis: SpendingAnalysisResult;
  transactionStatistics: TransactionStatistics;
  behaviorAnalysis: BehaviorAnalysisResult;
  goalProgress: GoalProgressEntry[];
  transactions: Transaction[];
  budgets: Budget[];
  now: Date;
}

export interface ScoreTrendPoint {
  label: string;
  now: Date;
  overallScore: number | null;
  grade: FinancialHealthGrade | null;
}
