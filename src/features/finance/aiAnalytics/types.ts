import type { Budget, Category, Goal, GoalMilestoneEvent, RecipientProfile, Transaction } from "@/features/finance/types";
import type { HealthScoreResult } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import type { AiInsight } from "@/features/finance/aiAnalytics/engine/analyzers/insights";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { TimelineEvent } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";
import type { ExecutiveSummaryPart } from "@/features/finance/aiAnalytics/engine/analyzers/executiveSummary";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { FinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { Summary } from "@/features/finance/aiAnalytics/models/summary.model";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { BehaviorAnalysisEngineResult } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ForecastEngineResult } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { ExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

export interface FinancialAnalysisInput {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  goals: Goal[];
  recipientProfiles: RecipientProfile[];
  goalMilestoneEvents: GoalMilestoneEvent[];
  now: Date;
}

export interface FinancialAnalysisResult {
  healthScore: HealthScoreResult;
  insights: AiInsight[];
  spendingAnalysis: SpendingAnalysisResult;
  behaviorAnalysis: BehaviorAnalysisResult;
  budgetAnalysis: BudgetAnalysisResult;
  cashFlowAnalysis: CashFlowAnalysisResult;
  forecast: ForecastResult;
  recommendations: Recommendation[];
  timeline: TimelineEvent[];
  executiveSummary: ExecutiveSummaryPart[];
  transactionStatistics: TransactionStatistics;
  goalProgress: GoalProgressEntry[];
  // Prompt 004's centralized domain models (src/features/finance/
  // aiAnalytics/models/) — additive, computed from the same analyzer
  // results above via build*() adapters, not new statistics.
  financialSnapshot: FinancialSnapshot;
  merchantAnalysis: MerchantAnalysis[];
  summary: Summary;
  // Prompt 005's independent, weighted, explainable scoring system — a new
  // parallel result alongside `healthScore` above (untouched, still the
  // old 4-tier system 4 rules and HealthScoreCard.tsx depend on).
  financialHealthScore: FinancialHealthScoreResult;
  // Prompt 006's enrichment + prioritization layer over `recommendations`
  // above (untouched) — the same rule findings, packaged with Summary/
  // Description/Difficulty/numeric Confidence/4-horizon Suggested Actions.
  actionableRecommendations: ActionableRecommendation[];
  // Prompt 007's synthesis layer over behaviorAnalysis above (untouched) —
  // spending-style classification, per-domain behavior scores, recurring/
  // seasonal pattern detection, and explainable habit insights.
  behaviorProfile: BehaviorAnalysisEngineResult;
  // Prompt 008's synthesis layer over `forecast` above (untouched) plus
  // Prompts 004-007's already-computed results — period-generic forecasts,
  // budget/savings/goal projections, category/merchant/behavior trend
  // classification, and forward-looking alerts. Engine only this pass —
  // What-If Scenario simulation is exposed as a standalone on-demand
  // function (simulateScenario), not part of this batch result.
  forecastProfile: ForecastEngineResult;
  // Prompt 009's synthesis layer over financialSnapshot/financialHealthScore/
  // actionableRecommendations/behaviorProfile/forecastProfile above — a
  // headline, guarded highlights, and a top-5 action plan, deliberately
  // separate from the two older, thinner `executiveSummary`/`summary`
  // fields above (both untouched, both predate Prompts 005-008).
  executiveSummaryReport: ExecutiveSummaryReport;
  meta: {
    generatedAt: string;
    transactionCount: number;
    monthsOfHistory: number;
  };
}

// The future-AI seam: `analyze()` returns a Promise even though the local
// engine computes synchronously, so a future RemoteAiEngine (a real network
// call to OpenAI/Claude/Gemini/a local LLM) can implement this same
// interface with zero changes to any call site.
export interface FinancialIntelligenceEngine {
  analyze(input: FinancialAnalysisInput): Promise<FinancialAnalysisResult>;
}
