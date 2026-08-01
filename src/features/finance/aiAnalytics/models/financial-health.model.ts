// Analytics domain model surface for Financial Health — aliases the type
// healthScore.ts already owns and computes. See healthScore.ts for
// analyzeHealthScore() and gradeForScore(); nothing here recomputes them.

export type { HealthScoreResult as FinancialHealth, HealthScoreSubScore, HealthScoreGrade, HealthScoreKey } from "@/features/finance/aiAnalytics/engine/analyzers/healthScore";
