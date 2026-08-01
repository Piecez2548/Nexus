// Analytics domain model surface for Cash Flow Analysis — aliases the types
// cashFlowAnalysis.ts already owns and computes. See cashFlowAnalysis.ts for
// analyzeCashFlow(); nothing here recomputes it.

export type { CashFlowAnalysisResult as CashFlowAnalysis, CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
