import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { HealthScoreResult } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { Transaction, Budget, Goal, GoalMilestoneEvent, RecipientProfile } from "@/features/finance/types";
import { runRules } from "@/features/finance/aiAnalytics/engine/rules/registry";

export type RecommendationPriority = "critical" | "high" | "medium" | "low" | "information";

// How much evidence backs the estimate behind a recommendation — a hard
// fact (a budget actually crossed) is "high" regardless of sample size; a
// heuristic derived from a handful of transactions is not.
export type RecommendationConfidence = "high" | "medium" | "low";

export interface RecommendationMessage {
  key: string;
  params: Record<string, string | number>;
}

export interface Recommendation {
  id: string;
  // Free-form per-rule identifier (matches the rule's own `id`), not a
  // fixed union — the whole point of the rule registry is that a new rule
  // never has to extend a central "list of every key" type.
  key: string;
  priority: RecommendationPriority;
  estimatedMonthlySavings: number;
  confidence: RecommendationConfidence;
  // The share of this month's total expense that estimatedMonthlySavings
  // represents, e.g. 5 meaning "could cut monthly spending by ~5%". Null
  // only when there's no expense this month to measure a share against.
  estimatedImpact: number | null;
  params: Record<string, string | number>;
  // {key, params} pairs, matching AiInsight/TimelineEvent's convention —
  // resolved via t(title.key, title.params) etc. only at render time. Every
  // rule supplies its own title, so RecommendationsSection.tsx never needs
  // a per-rule lookup table.
  title: RecommendationMessage;
  reason: RecommendationMessage;
  action: RecommendationMessage;
}

// Thin adapter: assembles a RuleContext from the same already-computed
// analyzer results localStatisticalEngine.ts always had, then delegates to
// the rule registry. Kept as a normal positional-args function (rather than
// forcing localStatisticalEngine.ts to build a RuleContext itself) so this
// stays the single, stable call site every other analyzer already uses.
export function generateRecommendations(
  budgetAnalysis: BudgetAnalysisResult,
  behaviorAnalysis: BehaviorAnalysisResult,
  spendingAnalysis: SpendingAnalysisResult,
  ruleHealthSignals: HealthScoreResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  transactions: Transaction[],
  budgets: Budget[],
  forecast: ForecastResult,
  transactionStatistics: TransactionStatistics,
  goals: Goal[],
  goalMilestoneEvents: GoalMilestoneEvent[],
  goalProgress: GoalProgressEntry[],
  recipientProfiles: RecipientProfile[],
  now: Date
): Recommendation[] {
  return runRules({
    transactions,
    budgets,
    recipientProfiles,
    ruleHealthSignals,
    budgetAnalysis,
    cashFlowAnalysis,
    spendingAnalysis,
    behaviorAnalysis,
    forecast,
    transactionStatistics,
    goals,
    goalMilestoneEvents,
    goalProgress,
    now,
  });
}
