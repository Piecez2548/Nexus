// Public barrel for the Executive Summary Generator (Prompt 009). See
// engine/computeExecutiveSummaryReport.ts for the main entry point and
// services/localExecutiveSummaryEngine.ts for the future-AI-provider seam.

export * from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/headlineBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/overallAssessmentBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/financialHighlightsBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/behaviorSummaryBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/forecastSummarySectionBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/riskSummaryBuilder";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/topRecommendationsSelector";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/sections/actionPlanAggregator";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/calculators/executiveSummaryConfidenceCalculator";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/engine/computeExecutiveSummaryReport";
export * from "@/features/finance/aiAnalytics/engine/executiveSummary/services/localExecutiveSummaryEngine";
