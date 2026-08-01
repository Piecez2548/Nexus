// Top-level orchestrator — assembles ForecastEngineResult from a
// ForecastEngineContext built entirely out of already-computed results
// (see localStatisticalEngine.ts's own wiring). Mirrors Prompt 007's
// engine/behavior/engine/analyzeBehaviorProfile.ts structure.

import { computeMonthlyForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/monthlyForecastPredictor";
import { computeWeeklyForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/weeklyForecastPredictor";
import { computeYearlyForecast } from "@/features/finance/aiAnalytics/engine/forecast/predictors/yearlyForecastPredictor";
import { estimateBudgetForecast } from "@/features/finance/aiAnalytics/engine/forecast/estimators/budgetForecastEstimator";
import { estimateSavingsForecast } from "@/features/finance/aiAnalytics/engine/forecast/estimators/savingsForecastEstimator";
import { estimateGoalForecasts } from "@/features/finance/aiAnalytics/engine/forecast/estimators/goalForecastEstimator";
import { analyzeCategoryTrends } from "@/features/finance/aiAnalytics/engine/forecast/trend/categoryTrendAnalyzer";
import { analyzeMerchantTrends } from "@/features/finance/aiAnalytics/engine/forecast/trend/merchantTrendAnalyzer";
import { analyzeBehaviorTrends } from "@/features/finance/aiAnalytics/engine/forecast/trend/behaviorTrendAnalyzer";
import { generateForecastAlerts } from "@/features/finance/aiAnalytics/engine/forecast/alerts/forecastAlertEngine";
import type { ForecastAlert, ForecastAlertSeverity, ForecastEngineContext, ForecastEngineResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

const SEVERITY_RANK: Record<ForecastAlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

function pickTopAlert(alerts: ForecastAlert[]): ForecastAlert | null {
  if (alerts.length === 0) return null;
  return alerts.reduce((top, a) => (SEVERITY_RANK[a.severity] > SEVERITY_RANK[top.severity] ? a : top));
}

export function computeForecastProfile(context: ForecastEngineContext): ForecastEngineResult {
  const { transactions, goals, goalMilestoneEvents, budgetProgress, cashFlowAnalysis, spendingAnalysis, behaviorAnalysis, merchantAnalysis, goalProgress, recommendations, behaviorProfile, financialHealthScore, monthsOfHistory, now } = context;

  const insufficientData = financialHealthScore.insufficientData;

  const monthlyForecast = computeMonthlyForecast(transactions, monthsOfHistory, insufficientData, now);
  const weeklyForecast = computeWeeklyForecast(transactions, monthsOfHistory, insufficientData, now);
  const yearlyForecast = computeYearlyForecast(transactions, monthsOfHistory, insufficientData, now);

  const budgetForecast = estimateBudgetForecast(budgetProgress, monthsOfHistory, insufficientData, now);
  const savingsForecast = estimateSavingsForecast(monthlyForecast, cashFlowAnalysis.monthlyTrend, goalProgress, monthsOfHistory, insufficientData);
  const goalForecast = estimateGoalForecasts(goals, goalMilestoneEvents, now);

  const categoryTrend = analyzeCategoryTrends(transactions, spendingAnalysis.categoryComparison, now);
  const merchantTrend = analyzeMerchantTrends(merchantAnalysis);
  const behaviorTrend = analyzeBehaviorTrends(
    behaviorProfile.profile.foodAnalysis.monthlyTrend,
    behaviorProfile.profile.coffeeAnalysis.monthlyTrend,
    behaviorProfile.profile.shoppingAnalysis.monthlyTrend,
    behaviorAnalysis.subscriptions,
    transactions,
    now
  );

  const alerts = generateForecastAlerts(recommendations, goalForecast);

  const subConfidences = [monthlyForecast.confidence, weeklyForecast.confidence, yearlyForecast.confidence, budgetForecast.confidence, savingsForecast.confidence];
  const confidence = Math.round(subConfidences.reduce((sum, c) => sum + c, 0) / subConfidences.length);

  return {
    summary: {
      expectedEndOfMonthBalance: monthlyForecast.expectedEndOfPeriodBalance,
      expectedSavings: monthlyForecast.expectedSavings,
      overallConfidence: confidence,
      topAlert: pickTopAlert(alerts),
    },
    details: { monthlyForecast, weeklyForecast, yearlyForecast, budgetForecast, savingsForecast, goalForecast },
    confidence,
    supportingMetrics: { monthsOfHistory, transactionCount: transactions.length, insufficientData },
    alerts,
    trendAnalysis: { category: categoryTrend, merchant: merchantTrend, behavior: behaviorTrend },
  };
}
