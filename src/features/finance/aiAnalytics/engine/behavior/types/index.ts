// Behavior Analysis Engine (Prompt 007) — a synthesis layer over the
// existing behaviorAnalysis.ts detectors, the Rule Engine, Prompt 005's
// scoring, Prompt 006's recommendations, and Prompt 004's models. See
// engine/behavior/index.ts for the public barrel and analyzeBehaviorProfile()
// for the main entry point.

import type { Transaction, Budget, RecipientProfile } from "@/features/finance/types";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { TimelineEvent } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

// {key, params} only, resolved via t(key, params) at render time — matches
// every other engine output in this app.
export interface BehaviorMessage {
  key: string;
  params: Record<string, string | number>;
}

export type HabitPolarity = "positive" | "negative" | "neutral";

export interface DetectedHabit {
  id: string;
  polarity: HabitPolarity;
  confidence: number; // 0-100
  message: BehaviorMessage;
  supportingMetrics: Record<string, string | number>;
}

export type SpendingStyle =
  | "budgetConscious"
  | "impulseSpender"
  | "restaurantLover"
  | "coffeeEnthusiast"
  | "shoppingEnthusiast"
  | "disciplinedSaver"
  | "balancedSpender"
  | "growingSaver"
  | "highRiskSpender";

export interface SpendingStyleClassification {
  // null when there isn't enough data to classify at all — never a
  // fabricated guess.
  primaryStyle: SpendingStyle | null;
  confidence: number; // 0-100, confidence in primaryStyle specifically
  // Every archetype's own 0-100 score — a classification is never a single
  // unexplained label, the full breakdown is always available.
  scores: Record<SpendingStyle, number>;
}

export interface BehaviorScores {
  overall: number | null;
  restaurant: number | null;
  shopping: number | null;
  coffee: number | null;
  budgetDiscipline: number | null;
  impulseControl: number | null;
  consistency: number | null;
}

export interface DomainTrendPoint {
  periodKey: string; // "YYYY-MM" for monthlyTrend, week-start "YYYY-MM-DD" for weeklyTrend
  amount: number;
}

export interface DomainSpendingAnalysis {
  totalSpent: number;
  transactionCount: number;
  averagePerVisit: number;
  averagePerDay: number;
  monthlyTrend: DomainTrendPoint[];
  weeklyTrend: DomainTrendPoint[];
  topMerchant: { alias: string; totalAmount: number } | null;
}

export type MonthPhase = "beginning" | "middle" | "end";

export interface SeasonalPatternResult {
  beginning: number; // day-of-month 1-10
  middle: number; // day-of-month 11-20
  end: number; // day-of-month 21-end
  dominantPhase: MonthPhase | "even";
}

export interface RecurringMerchantPattern {
  merchantAlias: string;
  // null when no single weekday clearly dominates the visit history.
  dominantWeekday: number | null; // Date.getDay() convention, 0=Sunday
  dominantWeekdayShare: number; // 0-100
  occurrenceCount: number;
  confidence: number;
}

export type TimeOfDayBucket = "morning" | "lunch" | "dinner" | "night" | "lateNight";

export interface TimeOfDaySpending {
  bucket: TimeOfDayBucket;
  totalAmount: number;
  transactionCount: number;
}

export interface HourWeekdayCell {
  weekday: number; // 0-6
  hour: number; // 0-23
  totalAmount: number;
  transactionCount: number;
}

export interface TimeAnalysisResult {
  // Mirrors mostActiveHour's own dataQuality convention — most
  // transactions don't carry the optional Transaction.time field.
  dataQuality: "full" | "thin" | "unavailable";
  byTimeOfDay: TimeOfDaySpending[]; // always 5 entries, one per TimeOfDayBucket
  byHourWeekday: HourWeekdayCell[]; // always 168 entries (7x24) — the heatmap's data
}

export interface MerchantBehaviorEntry {
  alias: string;
  category: string;
  totalSpending: number;
  frequency: number;
  isFavorite: boolean; // top by frequency among the ranked set
  isMostExpensive: boolean; // top by totalSpending among the ranked set
  loyaltyMonthsActive: number; // months with any spend, out of the trailing monthlyTrend window
  monthlyGrowthPercent: number | null;
}

// Everything analyzeBehaviorProfile() needs, drawn from analyzers/models
// earlier prompts already built — no raw analyzer recomputation here, only
// synthesis of what already exists.
export interface BehaviorEngineContext {
  transactions: Transaction[];
  budgets: Budget[];
  recipientProfiles: RecipientProfile[];
  behaviorAnalysis: BehaviorAnalysisResult;
  spendingAnalysis: SpendingAnalysisResult;
  cashFlowAnalysis: CashFlowAnalysisResult;
  budgetAnalysis: BudgetAnalysisResult;
  merchantAnalysis: MerchantAnalysis[];
  recommendations: Recommendation[];
  actionableRecommendations: ActionableRecommendation[];
  financialHealthScore: FinancialHealthScoreResult;
  timeline: TimelineEvent[];
  now: Date;
}

export interface BehaviorProfile {
  spendingStyle: SpendingStyleClassification;
  foodAnalysis: DomainSpendingAnalysis;
  coffeeAnalysis: DomainSpendingAnalysis;
  shoppingAnalysis: DomainSpendingAnalysis;
  transportAnalysis: DomainSpendingAnalysis;
  timeAnalysis: TimeAnalysisResult;
  merchantBehavior: MerchantBehaviorEntry[];
  recurringPatterns: RecurringMerchantPattern[];
  seasonalPattern: SeasonalPatternResult;
}

export interface BehaviorAnalysisEngineResult {
  profile: BehaviorProfile;
  scores: BehaviorScores;
  // The existing timeline.ts output, passed through unfiltered — already
  // covers salary/large-purchase/budget events, no new logic needed.
  timeline: TimelineEvent[];
  detectedHabits: DetectedHabit[];
  positiveHabits: DetectedHabit[];
  negativeHabits: DetectedHabit[];
  improvementOpportunities: BehaviorMessage[];
  insights: BehaviorMessage[];
  // The existing Prompt 006 ActionableRecommendation[], filtered to
  // behavior-relevant categories — zero new recommendation logic.
  recommendations: ActionableRecommendation[];
  confidence: number; // 0-100, overall data-quality-driven
}

// The future-AI seam, mirroring FinancialIntelligenceEngine/
// RecommendationEngine — analyze() returns a Promise even though the local
// implementation computes synchronously, so a future Claude/OpenAI/Gemini/
// Ollama-backed implementation can satisfy this same interface with zero
// changes to any call site.
export interface BehaviorEngine {
  analyze(context: BehaviorEngineContext): Promise<BehaviorAnalysisEngineResult>;
}
