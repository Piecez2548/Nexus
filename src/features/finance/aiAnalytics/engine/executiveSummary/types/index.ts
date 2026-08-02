// Executive Summary Generator (Prompt 009) — a synthesis layer over
// Prompt 004's FinancialSnapshot, Prompt 005's FinancialHealthScoreResult,
// Prompt 006's ActionableRecommendation[], Prompt 007's
// BehaviorAnalysisEngineResult, and Prompt 008's ForecastEngineResult. See
// engine/executiveSummary/index.ts for the public barrel and
// engine/computeExecutiveSummaryReport.ts for the main entry point.
//
// Rendered by components/executiveSummary/ExecutiveSummarySection.tsx. Two
// older, thinner summary-ish things this superseded (ExecutiveSummaryPart[]
// and the Summary model) were removed once no UI code still read them.

import type { FinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import type { FinancialHealthGrade, FinancialHealthStatus, FinancialHealthScoreResult, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { RecommendationMessage } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { BehaviorMessage, DetectedHabit, SpendingStyleClassification, BehaviorAnalysisEngineResult } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ForecastAlertSeverity, ForecastEngineResult } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

// {key, params} only, resolved via t(key, params) at render time — this
// engine's own genuinely-new synthesized content (headline, highlight
// labels). Everything else in this report reuses an existing message type
// directly (ScoreMessage, BehaviorMessage, RecommendationMessage) since
// it's a pure pass-through, not new content.
export interface ExecutiveSummaryMessage {
  key: string;
  params: Record<string, string | number>;
}

export type HeadlineKey = "insufficientData" | "budgetRiskDetected" | "excellentFinancialProgress" | "strongSavingPerformance" | "spendingRequiresAttention" | "stableFinancialPosition";

export interface Headline {
  key: HeadlineKey;
  message: ExecutiveSummaryMessage;
}

export interface OverallAssessment {
  overallScore: number | null;
  grade: FinancialHealthGrade | null;
  status: FinancialHealthStatus | null;
  insufficientData: boolean;
  topStrengths: ScoreMessage[];
  topWeaknesses: ScoreMessage[];
}

export type HighlightType = "highestSpendingCategory" | "bestPerformingHabit" | "largestImprovement" | "savingAchievement" | "budgetAchievement";

// Mirrors DetectedHabit's own {message, supportingMetrics} shape — one
// homogeneous list a future consumer can map over uniformly, rather than 5
// differently-shaped optional fields.
export interface HighlightEntry {
  type: HighlightType;
  message: ExecutiveSummaryMessage;
  supportingMetrics: Record<string, string | number>;
}

export interface FinancialHighlights {
  // Only computable highlights — an entry is omitted, never fabricated,
  // when its source data doesn't support it (see each builder's own guard).
  entries: HighlightEntry[];
}

// Almost entirely pass-through of Prompt 007's own output — behaviorProfile
// .insights already covers restaurant/coffee-trend, weekend-spending, and
// late-night signals; zero new domain-trend logic here.
export interface BehaviorSummary {
  spendingStyle: SpendingStyleClassification;
  insights: BehaviorMessage[];
  topPositiveHabits: DetectedHabit[]; // capped, by confidence
  topNegativeHabits: DetectedHabit[]; // capped, by confidence
  confidence: number;
}

// Pure selection over Prompt 008's own ForecastSummary/ForecastDetails.
// Named ForecastSummarySection (not ForecastSummary) to avoid colliding
// with Prompt 008's own exported ForecastSummary type.
export interface ForecastSummarySection {
  expectedEndOfMonthBalance: number | null;
  expectedSavings: number;
  categoriesLikelyToExceed: string[];
  categoriesLikelyToRemainUnder: string[];
  goalsAtRisk: string[]; // goal names where goalForecast[].projectedDelayDays > 0
  cashFlowStabilityScore: number | null;
  confidence: number;
}

export type RiskCategory = "budgetOverflow" | "highSpendingCategories" | "unusualSpendingBehavior" | "savingsDecline" | "cashShortage" | "goalDelay";

// message reused verbatim from the originating ForecastAlert — not a new
// message.
export interface RiskEntry {
  category: RiskCategory;
  severity: ForecastAlertSeverity;
  message: ExecutiveSummaryMessage;
  sourceAlertId: string;
}

export interface RiskSummary {
  entries: RiskEntry[]; // derived from forecastProfile.alerts, severity-sorted
}

// Every bucket is a deduped (by message key) concatenation of the top
// recommendations' own suggestedActions.* messages — never new content.
export interface ActionPlan {
  immediate: RecommendationMessage[];
  weekly: RecommendationMessage[];
  monthly: RecommendationMessage[];
  longTerm: RecommendationMessage[];
}

export interface ExecutiveSummaryReport {
  headline: Headline;
  overallSummary: OverallAssessment;
  highlights: FinancialHighlights;
  behaviorSummary: BehaviorSummary;
  forecastSummary: ForecastSummarySection;
  riskSummary: RiskSummary;
  // Top 5, already-prioritized order preserved — no re-sort.
  topRecommendations: ActionableRecommendation[];
  actionPlan: ActionPlan;
  confidence: number; // 0-100, always a number — never null
}

// Deliberately excludes raw Recommendation[] ("Triggered Rules") — every
// finding it represents is already reachable through actionableRecommendations
// (1:1 enrichment traceability via relatedRules) and forecastProfile.alerts
// (sourceRecommendationId traces back) — a third redundant path isn't
// needed, mirroring RecommendationEngineContext's own exclusion of
// FinancialSnapshot for the same reason.
export interface ExecutiveSummaryEngineContext {
  financialSnapshot: FinancialSnapshot;
  financialHealthScore: FinancialHealthScoreResult;
  actionableRecommendations: ActionableRecommendation[];
  behaviorProfile: BehaviorAnalysisEngineResult;
  forecastProfile: ForecastEngineResult;
  budgetAnalysis: BudgetAnalysisResult; // for highlights.budgetAchievement — not on FinancialSnapshot
  spendingAnalysis: SpendingAnalysisResult; // for highlights.largestImprovement's categoryComparison
}

// The future-AI seam, mirroring ForecastEngine/BehaviorEngine/
// RecommendationEngine — generate() returns a Promise even though the
// local implementation computes synchronously, so a future Claude/OpenAI/
// Gemini/Ollama-backed implementation can satisfy this same interface with
// zero changes to any call site.
export interface ExecutiveSummaryEngine {
  generate(context: ExecutiveSummaryEngineContext): Promise<ExecutiveSummaryReport>;
}
