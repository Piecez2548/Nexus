// Barrel for the Financial Health Scoring System (Prompt 005) — a new,
// independent scoring engine alongside engine/analyzers/healthScore.ts
// (untouched). See computeFinancialHealthScore for the main entry point and
// scoreTrend for historical comparison without persistence.

export * from "@/features/finance/aiAnalytics/engine/scoring/types";
export * from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/savingRateScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/budgetDisciplineScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/expenseControlScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/cashFlowScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/incomeStabilityScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/behaviorScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/calculators/goalProgressScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/explanations/aggregateExplanations";
export * from "@/features/finance/aiAnalytics/engine/scoring/score-engine/computeFinancialHealthScore";
export * from "@/features/finance/aiAnalytics/engine/scoring/score-engine/buildScoreContext";
export * from "@/features/finance/aiAnalytics/engine/scoring/score-engine/scoreTrend";
