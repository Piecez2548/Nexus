import type { Transaction, Budget, Goal, GoalMilestoneEvent, RecipientProfile } from "@/features/finance/types";
import type { HealthScoreResult } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Matches the spec's top-level rule taxonomy. Food/Restaurant/Coffee/
// Shopping/Transport are folders under rules/ for developer navigability,
// not separate categories here — the spec's own category list doesn't
// break them out either, they're all "expense".
export type RuleCategory =
  | "financialHealth"
  | "budget"
  | "income"
  | "expense"
  | "savings"
  | "cashFlow"
  | "behavior"
  | "merchant"
  | "subscriptions"
  | "forecast"
  | "goals";

// Everything a rule might need, already computed earlier in
// localStatisticalEngine.ts's pipeline — rules never recompute raw stats,
// only combine/threshold what's already here (or a shared helper in
// engine/analyzers/multiMonthTrends.ts for multi-period patterns).
export interface RuleContext {
  transactions: Transaction[];
  budgets: Budget[];
  recipientProfiles: RecipientProfile[];
  // Legacy unweighted score retained specifically as rule input. This is
  // intentionally distinct from the weighted financialHealthScore rendered
  // by the UI; naming it as signals prevents the two score systems from being
  // mistaken for interchangeable outputs.
  ruleHealthSignals: HealthScoreResult;
  budgetAnalysis: BudgetAnalysisResult;
  cashFlowAnalysis: CashFlowAnalysisResult;
  spendingAnalysis: SpendingAnalysisResult;
  behaviorAnalysis: BehaviorAnalysisResult;
  forecast: ForecastResult;
  transactionStatistics: TransactionStatistics;
  goals: Goal[];
  goalMilestoneEvents: GoalMilestoneEvent[];
  goalProgress: GoalProgressEntry[];
  now: Date;
}

// One file = one rule. A rule may produce zero, one, or several
// recommendations in a single evaluate() call (e.g. one per over-budget
// category) — always an array, empty when it doesn't fire.
export interface FinancialRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  defaultPriority: RecommendationPriority;
  enabled: boolean;
  evaluate(context: RuleContext): RecommendationDraft[];
}
