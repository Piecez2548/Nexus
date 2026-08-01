// Top-level orchestrator — assembles ExecutiveSummaryReport from an
// ExecutiveSummaryEngineContext built entirely out of already-computed
// results (see localStatisticalEngine.ts's own wiring). Mirrors Prompt 007/
// 008's engine/*/engine/*.ts structure.

import { buildHeadline } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/headlineBuilder";
import { buildOverallAssessment } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/overallAssessmentBuilder";
import { buildFinancialHighlights } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/financialHighlightsBuilder";
import { buildBehaviorSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/behaviorSummaryBuilder";
import { buildForecastSummarySection } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/forecastSummarySectionBuilder";
import { buildRiskSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/riskSummaryBuilder";
import { selectTopRecommendations } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/topRecommendationsSelector";
import { buildActionPlan } from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/actionPlanAggregator";
import { calculateExecutiveSummaryConfidence } from "@/features/finance/aiAnalytics/engine/executiveSummary/calculators/executiveSummaryConfidenceCalculator";
import type { ExecutiveSummaryEngineContext, ExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

export function computeExecutiveSummaryReport(context: ExecutiveSummaryEngineContext): ExecutiveSummaryReport {
  const { financialSnapshot, financialHealthScore, actionableRecommendations, behaviorProfile, forecastProfile, budgetAnalysis, spendingAnalysis } = context;

  const headline = buildHeadline(financialHealthScore, forecastProfile.summary.topAlert);
  const overallSummary = buildOverallAssessment(financialHealthScore);
  const highlights = buildFinancialHighlights(financialSnapshot, behaviorProfile.positiveHabits, spendingAnalysis.categoryComparison, budgetAnalysis);
  const behaviorSummary = buildBehaviorSummary(behaviorProfile);
  const forecastSummary = buildForecastSummarySection(forecastProfile);
  const riskSummary = buildRiskSummary(forecastProfile.alerts);
  const topRecommendations = selectTopRecommendations(actionableRecommendations);
  const actionPlan = buildActionPlan(topRecommendations);
  const confidence = calculateExecutiveSummaryConfidence(behaviorProfile.confidence, forecastProfile.confidence, financialHealthScore);

  return { headline, overallSummary, highlights, behaviorSummary, forecastSummary, riskSummary, topRecommendations, actionPlan, confidence };
}
