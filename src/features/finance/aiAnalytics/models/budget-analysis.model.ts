// Analytics domain model surface for Budget Analysis — aliases the types
// budgetAnalysis.ts already owns and computes. See budgetAnalysis.ts for
// analyzeBudgets(); nothing here recomputes it. Per-entry status is the
// shared BudgetStatus enum (models/enums.ts), aliased from
// utils/budgetStatus.ts rather than redeclared here.

export type { BudgetAnalysisResult as BudgetAnalysis, BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
