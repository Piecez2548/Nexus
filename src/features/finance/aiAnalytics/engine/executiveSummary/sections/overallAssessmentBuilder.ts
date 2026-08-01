// Pure selection over Prompt 005's own FinancialHealthScoreResult — zero
// new messages, zero new scoring logic.

import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { OverallAssessment } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

const TOP_N = 3;

export function buildOverallAssessment(financialHealthScore: FinancialHealthScoreResult): OverallAssessment {
  const { overallScore, grade, status, insufficientData, strengths, weaknesses } = financialHealthScore;

  return {
    overallScore,
    grade,
    status,
    insufficientData,
    topStrengths: strengths.slice(0, TOP_N),
    topWeaknesses: weaknesses.slice(0, TOP_N),
  };
}
