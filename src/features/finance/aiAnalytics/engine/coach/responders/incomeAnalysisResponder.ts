// Income Analysis — the thinnest intent: no income category/source
// breakdown exists ANYWHERE in the pipeline (computeExpenseByCategory is
// hard-filtered to type==="expense"). This responder answers only what's
// genuinely derivable (amount + trend) and states the limitation in-band
// rather than fabricating a source breakdown — mirrors foodAnalyzer.ts's
// own "explicitly out of scope, would be fabricated not derived" comment.
// A confidence CEILING (not a 0) reflects this: the numbers given ARE
// exact and reliable, just narrower than a "by source" question implies.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.incomeAnalysis";
const INCOME_BREAKDOWN_CEILING = 65;

export function respondIncomeAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { cashFlowAnalysis } = data;
  const hasData = cashFlowAnalysis.income > 0;
  const changePercent = cashFlowAnalysis.changeVsPreviousMonth.income;

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { income: Math.round(cashFlowAnalysis.income), changePercent: changePercent !== null ? Math.round(changePercent) : 0 } }
    : { key: `${NS}.noData`, params: {} };

  // Always states the limitation, regardless of whether there's data —
  // this is about a structural gap in the pipeline, not about this
  // particular month's data availability.
  const reason: CoachMessage = { key: `${NS}.reason`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasData ? { income: cashFlowAnalysis.income } : {};
  if (changePercent !== null) supportingMetrics.changePercent = changePercent;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData, ceiling: INCOME_BREAKDOWN_CEILING }),
    relatedRecommendations: [],
  };
}
