// Forecast & Trend Engine (Prompt 008) — a synthesis layer over the
// existing forecast.ts linear projection, multiMonthTrends.ts primitives,
// Prompt 004's MerchantAnalysis, Prompt 006's Rule Engine, and Prompt 007's
// BehaviorAnalysisEngineResult. See engine/forecast/index.ts for the public
// barrel and engine/computeForecastProfile.ts for the main entry point.
//
// Engine-only this pass — no UI. What-If Scenarios are deliberately NOT
// part of ForecastEngineResult: they're parameterized by user input, so
// simulateScenario() is exported standalone for a future hook/UI to call
// on-demand, the same way useCategoryDetail computes on-demand rather than
// as part of the main batch result.

import type { Transaction, Budget, BudgetPeriod, Goal, GoalMilestoneEvent, RecipientProfile } from "@/features/finance/types";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { BehaviorAnalysisEngineResult } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

// ── Shared period-forecast core — satisfies both the spec's MONTH-END
// FORECAST section (remaining balance/expenses/income/savings/budget
// status/confidence) and its CASH FLOW FORECAST section (income/expenses/
// net cash flow/remaining balance/stability): both describe the same
// linear-projection numbers from two angles, so one shape covers both
// rather than fabricating a second object that just re-packages the same
// figures. Used for Monthly/Weekly/Yearly Forecast alike. ──
export interface PeriodForecast {
  period: BudgetPeriod;
  rangeStart: string; // ISO date
  rangeEnd: string;
  incomeSoFar: number;
  expenseSoFar: number;
  expectedIncome: number; // full-period linear projection
  expectedExpense: number;
  remainingExpectedExpense: number; // max(0, expectedExpense - expenseSoFar)
  expectedSavings: number; // expectedIncome - expectedExpense
  // Only meaningful for "monthly"/"yearly" — both align with the existing
  // month-keyed cumulativeBalanceAsOf() primitive. There's no day-level
  // equivalent, so "weekly" is null rather than a fabricated mismatched
  // figure.
  expectedEndOfPeriodBalance: number | null;
  // 0-100, coefficient-of-variation-based (see calculators/stabilityMath.ts).
  // Null if fewer than 2 active trailing months exist to measure variation.
  cashFlowStabilityScore: number | null;
  confidence: number; // 0-100, via forecastConfidenceCalculator
  basis: "insufficientData" | "linearProjection";
}

export type MonthlyForecast = PeriodForecast;
export type WeeklyForecast = PeriodForecast;
export type YearlyForecast = PeriodForecast;

// ── Budget Forecast ──
export type BudgetForecastClassification = "likelyExceed" | "likelyRemainUnder";

export interface BudgetForecastEntry {
  category: string;
  period: BudgetPeriod;
  budgetAmount: number;
  spentSoFar: number;
  projectedSpend: number;
  projectedPercentage: number; // unclamped, can exceed 100
  completionPercentage: number; // clamped 0-100, today's actual usage (re-exposes BudgetProgress.percentage)
  estimatedOverflowAmount: number; // max(0, projectedSpend - budgetAmount)
  classification: BudgetForecastClassification;
}

export interface BudgetForecastResult {
  // Excludes budgets already status==="over" (a present-tense fact, not a
  // forecast) and amount<=0 — matches forecast.ts's own exclusions.
  entries: BudgetForecastEntry[];
  categoriesLikelyToExceed: string[];
  categoriesLikelyToRemainUnder: string[];
  confidence: number;
}

// ── Savings Forecast ──
export interface SavingsForecastGoalEntry {
  goalName: string;
  monthsToReachAtCurrentPace: number | null; // null if expectedMonthlySavings <= 0
}

export interface SavingsForecastResult {
  expectedMonthlySavings: number; // = monthlyForecast.expectedSavings, passed in, never recomputed
  savingRatePercent: number | null; // null if expectedIncome <= 0
  // Real historical extremes from the trailing monthlyTrend window, not a
  // modeled range — null if fewer than 2 active months.
  bestCaseMonthlySavings: number | null;
  worstCaseMonthlySavings: number | null;
  goalTimelines: SavingsForecastGoalEntry[]; // one per incomplete goal
  confidence: number;
}

// ── Goal Forecast ──
export interface GoalForecastEntry {
  goal: Goal;
  // True only when >=2 milestone events exist for this goal — the only
  // real historical-pace signal available (Goal itself has no creation
  // date, GoalMilestoneEvent tracks tier-crossing timestamps only, no
  // contribution amounts).
  paceKnown: boolean;
  monthlyProgressAmount: number | null; // pace * ~30.44 days, null unless paceKnown
  expectedCompletionDate: string | null; // null unless paceKnown && pace > 0
  // Pure arithmetic: (targetAmount-currentAmount)/monthsRemaining — always
  // computable given a deadline and an incomplete goal, independent of
  // pace data.
  requiredMonthlyContribution: number | null;
  // 0-100 explainable heuristic (not a statistical model): ratio of actual
  // pace to required pace, scaled so hitting exactly the required pace
  // scores 70. Null unless both a deadline exists and paceKnown.
  probabilityOfCompletion: number | null;
  projectedDelayDays: number | null; // expectedCompletionDate - deadline, in days; null unless both exist
}

// ── Category / Merchant / Behavior Trend ──
export type TrendDirection = "increasing" | "decreasing" | "stable" | "insufficientData";

export interface CategoryTrendEntry {
  category: string;
  monthlyGrowthPercent: number | null;
  weeklyGrowthPercent: number | null;
  direction: TrendDirection;
}

export interface CategoryTrendResult {
  entries: CategoryTrendEntry[];
  fastestGrowingCategory: string | null;
  fastestDecliningCategory: string | null;
  stableCategories: string[];
  // Year-over-year trend: the spec's own "future support" item, explicitly
  // deferred — no year-over-year data exists yet, no stub field.
}

export type MerchantTrendDirection = "growing" | "declining" | "stable" | "insufficientData";

export interface MerchantTrendEntry {
  alias: string;
  monthlyGrowthPercent: number | null; // sourced directly from MerchantAnalysis.monthlyGrowthPercent, never recomputed
  direction: MerchantTrendDirection;
}

export interface MerchantTrendResult {
  mostVisited: MerchantTrendEntry[];
  growingMerchants: MerchantTrendEntry[];
  decliningMerchants: MerchantTrendEntry[];
  spendingConcentrationPercent: number | null; // topMerchant.totalSpending / sum(all), null if no merchants
}

export type BehaviorTrendDomain = "restaurant" | "coffee" | "shopping" | "subscriptionCost" | "weekendSpending";

export interface BehaviorTrendEntry {
  domain: BehaviorTrendDomain;
  changePercent: number | null;
  direction: TrendDirection;
}

export interface BehaviorTrendResult {
  entries: BehaviorTrendEntry[]; // always 5, one per BehaviorTrendDomain
}

// ── Alerts — reuses the Rule Engine's own recommendations rather than a
// parallel framework; see alerts/forecastAlertEngine.ts ──
export type ForecastAlertSeverity = "critical" | "warning" | "info";
export type ForecastAlertType = "budgetOverflow" | "savingsDecline" | "cashShortage" | "unusualSpendingGrowth" | "goalDelay";

export interface ForecastAlert {
  id: string;
  type: ForecastAlertType;
  severity: ForecastAlertSeverity;
  message: { key: string; params: Record<string, string | number> };
  relatedForecastKey: string;
  // Traceability back to the originating Rule Engine recommendation — null
  // only for the genuinely-new forward-looking "goalDelay" alerts this
  // engine computes itself.
  sourceRecommendationId: string | null;
}

// ── What-If Scenarios — not part of ForecastEngineResult, see the file
// header comment. Discriminated union so each variant only carries the
// fields that apply to it (keeps "null = insufficient data" distinct from
// "null = not applicable to this scenario type"). ──
export type WhatIfScenarioInput =
  | { type: "reduceFoodSpending"; reductionPercent: number }
  | { type: "increaseGoalSavings"; goalSyncId: string; additionalMonthlyAmount: number }
  | { type: "cancelSubscriptions"; normalizedTitles: string[] }
  | { type: "reduceCoffeeSpending"; reductionPercent: number };

export type WhatIfResult =
  | { type: "reduceFoodSpending"; estimatedMonthlySavings: number; estimatedYearlySavings: number }
  | { type: "increaseGoalSavings"; estimatedCompletionDate: string | null; monthsSaved: number | null }
  | { type: "cancelSubscriptions"; estimatedMonthlySavings: number; estimatedYearlySavings: number }
  | { type: "reduceCoffeeSpending"; baselineScore: number | null; projectedScore: number | null; estimatedScoreImprovement: number | null };

// Everything simulateScenario()'s dispatcher needs across all 4 scenario
// types — a subset of ForecastEngineContext's own fields plus
// spendingAnalysis/subscriptions, which the batch ForecastEngineResult
// doesn't otherwise need to carry.
export interface WhatIfScenarioContext {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalMilestoneEvents: GoalMilestoneEvent[];
  recipientProfiles: RecipientProfile[];
  goalProgress: GoalProgressEntry[];
  spendingAnalysis: SpendingAnalysisResult;
  subscriptions: BehaviorAnalysisResult["subscriptions"];
  now: Date;
}

// ── Context & Result ──
export interface ForecastEngineContext {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalMilestoneEvents: GoalMilestoneEvent[];
  recipientProfiles: RecipientProfile[];
  budgetProgress: BudgetProgress[]; // reused from runAnalysis's already-computed one, not recomputed
  cashFlowAnalysis: CashFlowAnalysisResult;
  budgetAnalysis: BudgetAnalysisResult;
  spendingAnalysis: SpendingAnalysisResult;
  behaviorAnalysis: BehaviorAnalysisResult;
  merchantAnalysis: MerchantAnalysis[];
  goalProgress: GoalProgressEntry[];
  recommendations: Recommendation[];
  behaviorProfile: BehaviorAnalysisEngineResult;
  financialHealthScore: FinancialHealthScoreResult;
  monthsOfHistory: number;
  now: Date;
}

export interface ForecastSummary {
  expectedEndOfMonthBalance: number | null;
  expectedSavings: number;
  overallConfidence: number;
  topAlert: ForecastAlert | null;
}

export interface ForecastDetails {
  monthlyForecast: MonthlyForecast;
  weeklyForecast: WeeklyForecast;
  yearlyForecast: YearlyForecast;
  budgetForecast: BudgetForecastResult;
  savingsForecast: SavingsForecastResult;
  goalForecast: GoalForecastEntry[];
}

export interface ForecastTrendAnalysis {
  category: CategoryTrendResult;
  merchant: MerchantTrendResult;
  behavior: BehaviorTrendResult;
}

export interface ForecastSupportingMetrics {
  monthsOfHistory: number;
  transactionCount: number;
  insufficientData: boolean;
}

export interface ForecastEngineResult {
  summary: ForecastSummary;
  details: ForecastDetails;
  confidence: number; // overall — average of the computable sub-confidences above
  supportingMetrics: ForecastSupportingMetrics;
  alerts: ForecastAlert[];
  trendAnalysis: ForecastTrendAnalysis;
}

// The future-AI seam, mirroring BehaviorEngine/RecommendationEngine/
// FinancialIntelligenceEngine — forecast() returns a Promise even though
// the local implementation computes synchronously, so a future Claude/
// OpenAI/Gemini/Ollama-backed implementation can satisfy this same
// interface with zero changes to any call site.
export interface ForecastEngine {
  forecast(context: ForecastEngineContext): Promise<ForecastEngineResult>;
}
