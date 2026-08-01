// Public barrel for the Forecast & Trend Engine (Prompt 008). See
// engine/computeForecastProfile.ts for the main entry point and
// services/localForecastEngine.ts for the future-AI-provider seam.

export * from "@/features/finance/aiAnalytics/engine/forecast/types";
export * from "@/features/finance/aiAnalytics/engine/forecast/calculators/mathUtils";
export * from "@/features/finance/aiAnalytics/engine/forecast/calculators/stabilityMath";
export * from "@/features/finance/aiAnalytics/engine/forecast/calculators/forecastConfidenceCalculator";
export * from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
export * from "@/features/finance/aiAnalytics/engine/forecast/predictors/monthlyForecastPredictor";
export * from "@/features/finance/aiAnalytics/engine/forecast/predictors/weeklyForecastPredictor";
export * from "@/features/finance/aiAnalytics/engine/forecast/predictors/yearlyForecastPredictor";
export * from "@/features/finance/aiAnalytics/engine/forecast/estimators/budgetForecastEstimator";
export * from "@/features/finance/aiAnalytics/engine/forecast/estimators/savingsForecastEstimator";
export * from "@/features/finance/aiAnalytics/engine/forecast/estimators/goalForecastEstimator";
export * from "@/features/finance/aiAnalytics/engine/forecast/trend/trendClassification";
export * from "@/features/finance/aiAnalytics/engine/forecast/trend/categoryTrendAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/forecast/trend/merchantTrendAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/forecast/trend/behaviorTrendAnalyzer";
export * from "@/features/finance/aiAnalytics/engine/forecast/alerts/forecastAlertEngine";
export * from "@/features/finance/aiAnalytics/engine/forecast/scenarios/whatIfScenarios";
export * from "@/features/finance/aiAnalytics/engine/forecast/scenarios/scenarioPipelineRunner";
export * from "@/features/finance/aiAnalytics/engine/forecast/engine/computeForecastProfile";
export * from "@/features/finance/aiAnalytics/engine/forecast/services/localForecastEngine";
