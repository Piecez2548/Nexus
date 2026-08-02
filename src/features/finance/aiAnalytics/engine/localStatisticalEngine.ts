import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";
import { analyzeHealthScore, computeMonthsOfHistory } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
import { analyzeBudgets } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import { analyzeCashFlow } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import { analyzeSpending } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import { analyzeBehavior } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { generateInsights } from "@/features/finance/aiAnalytics/engine/analyzers/insights";
import { generateRecommendations } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import { generateForecast } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";
import { buildTimeline } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";
import { computeTransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import { analyzeGoals } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import { buildFinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import { buildMerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import { computeFinancialHealthScore } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/computeFinancialHealthScore";
import { generateActionableRecommendations } from "@/features/finance/aiAnalytics/engine/recommendation/engine/generateActionableRecommendations";
import { analyzeBehaviorProfile } from "@/features/finance/aiAnalytics/engine/behavior/engine/analyzeBehaviorProfile";
import { computeForecastProfile } from "@/features/finance/aiAnalytics/engine/forecast/engine/computeForecastProfile";
import { computeExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/engine/computeExecutiveSummaryReport";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ForecastEngineContext } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { ExecutiveSummaryEngineContext } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { FinancialAnalysisInput, FinancialAnalysisResult, FinancialIntelligenceEngine } from "@/features/finance/aiAnalytics/types";

// Exported separately from the engine object so orchestration itself is
// unit-testable synchronously, without unwrapping a Promise in every test.
export function runAnalysis(input: FinancialAnalysisInput): FinancialAnalysisResult {
  const { transactions, budgets, goals, recipientProfiles, goalMilestoneEvents, now } = input;

  // Computed once, shared by every analyzer that needs it (healthScore,
  // budgetAnalysis, forecast) — guarantees they all agree on the same
  // spent/status figures instead of each re-deriving it slightly differently.
  const budgetProgress: BudgetProgress[] = budgets.map((budget) => ({
    budget,
    ...computeBudgetSpend(budget, transactions, now),
  }));

  const healthScore = analyzeHealthScore(transactions, budgetProgress, now);
  const budgetAnalysis = analyzeBudgets(budgetProgress);
  const cashFlowAnalysis = analyzeCashFlow(transactions, now);
  const spendingAnalysis = analyzeSpending(transactions, cashFlowAnalysis.monthlyTrend, now);
  const behaviorAnalysis = analyzeBehavior(transactions, recipientProfiles, budgets, spendingAnalysis.weekdayAnalysis, now);
  const forecast = generateForecast(transactions, budgetProgress, now);
  const transactionStatistics = computeTransactionStatistics(transactions, spendingAnalysis, cashFlowAnalysis, now);
  const goalProgress = analyzeGoals(goals, goalMilestoneEvents, now);
  const insights = generateInsights(spendingAnalysis, budgetAnalysis, cashFlowAnalysis, behaviorAnalysis, forecast);
  const recommendations = generateRecommendations(
    budgetAnalysis,
    behaviorAnalysis,
    spendingAnalysis,
    healthScore,
    cashFlowAnalysis,
    transactions,
    budgets,
    forecast,
    transactionStatistics,
    goals,
    goalMilestoneEvents,
    goalProgress,
    recipientProfiles,
    now
  );
  const timeline = buildTimeline(transactions, budgetAnalysis, behaviorAnalysis, cashFlowAnalysis, spendingAnalysis, goalMilestoneEvents, now);
  const financialSnapshot = buildFinancialSnapshot(cashFlowAnalysis, budgetAnalysis, spendingAnalysis, behaviorAnalysis, transactionStatistics, transactions, now);
  const merchantAnalysis = buildMerchantAnalysis(behaviorAnalysis, recipientProfiles, transactions, recommendations);

  // Reuses the same already-computed analyzer results as everything else
  // above — buildScoreContext.ts (which re-runs these analyzers) is only
  // needed for scoreTrend.ts's historical-comparison points, not here.
  const scoreContext: ScoreContext = { cashFlowAnalysis, budgetAnalysis, spendingAnalysis, transactionStatistics, behaviorAnalysis, goalProgress, transactions, budgets, now };
  const financialHealthScore = computeFinancialHealthScore(scoreContext);

  const monthsOfHistory = computeMonthsOfHistory(transactions, now);
  const recommendationEngineContext: RecommendationEngineContext = { recommendations, budgetAnalysis, cashFlowAnalysis, merchantAnalysis, financialHealthScore, monthsOfHistory, now };
  const actionableRecommendations = generateActionableRecommendations(recommendationEngineContext);

  // Computed last — needs recommendations, actionableRecommendations,
  // merchantAnalysis, financialHealthScore, and timeline, all already
  // computed above.
  const behaviorEngineContext: BehaviorEngineContext = {
    transactions,
    budgets,
    recipientProfiles,
    behaviorAnalysis,
    spendingAnalysis,
    cashFlowAnalysis,
    budgetAnalysis,
    merchantAnalysis,
    recommendations,
    actionableRecommendations,
    financialHealthScore,
    timeline,
    now,
  };
  const behaviorProfile = analyzeBehaviorProfile(behaviorEngineContext);

  // Computed last — needs recommendations, merchantAnalysis, goalProgress,
  // behaviorProfile, and financialHealthScore, all already computed above.
  const forecastEngineContext: ForecastEngineContext = {
    transactions,
    budgets,
    goals,
    goalMilestoneEvents,
    recipientProfiles,
    budgetProgress,
    cashFlowAnalysis,
    budgetAnalysis,
    spendingAnalysis,
    behaviorAnalysis,
    merchantAnalysis,
    goalProgress,
    recommendations,
    behaviorProfile,
    financialHealthScore,
    monthsOfHistory,
    now,
  };
  const forecastProfile = computeForecastProfile(forecastEngineContext);

  // Computed last of all — needs financialSnapshot, financialHealthScore,
  // actionableRecommendations, behaviorProfile, forecastProfile,
  // budgetAnalysis, and spendingAnalysis, all already computed above.
  const executiveSummaryEngineContext: ExecutiveSummaryEngineContext = {
    financialSnapshot,
    financialHealthScore,
    actionableRecommendations,
    behaviorProfile,
    forecastProfile,
    budgetAnalysis,
    spendingAnalysis,
  };
  const executiveSummaryReport = computeExecutiveSummaryReport(executiveSummaryEngineContext);

  return {
    healthScore,
    insights,
    spendingAnalysis,
    behaviorAnalysis,
    budgetAnalysis,
    cashFlowAnalysis,
    forecast,
    recommendations,
    timeline,
    transactionStatistics,
    goalProgress,
    financialSnapshot,
    merchantAnalysis,
    financialHealthScore,
    actionableRecommendations,
    behaviorProfile,
    forecastProfile,
    executiveSummaryReport,
    meta: {
      generatedAt: now.toISOString(),
      transactionCount: transactions.length,
      monthsOfHistory,
    },
  };
}

export const localStatisticalEngine: FinancialIntelligenceEngine = {
  analyze: (input) => Promise.resolve(runAnalysis(input)),
};
