// A 6-branch, purely data-driven decision tree — every branch reads an
// already-computed upstream judgment (Prompt 005's status/positiveFactors,
// Prompt 008's topAlert), never a new hardcoded threshold that could drift
// out of sync with the real scoring config.

import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ForecastAlert } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { Headline, HeadlineKey } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

const NS = "aiAnalytics.executiveSummaryReport.headline";

function hasPositiveSavingRateFactor(financialHealthScore: FinancialHealthScoreResult): boolean {
  const savingRateCategory = financialHealthScore.categoryScores.find((c) => c.category === "savingRate");
  return (savingRateCategory?.explanation.positiveFactors.length ?? 0) > 0;
}

export function buildHeadline(financialHealthScore: FinancialHealthScoreResult, topAlert: ForecastAlert | null): Headline {
  let key: HeadlineKey;
  if (financialHealthScore.insufficientData) {
    key = "insufficientData";
  } else if (topAlert?.severity === "critical") {
    key = topAlert.type === "budgetOverflow" ? "budgetRiskDetected" : "spendingRequiresAttention";
  } else if (financialHealthScore.status === "excellent" || financialHealthScore.status === "outstanding") {
    key = "excellentFinancialProgress";
  } else if (hasPositiveSavingRateFactor(financialHealthScore)) {
    key = "strongSavingPerformance";
  } else if (topAlert?.severity === "warning") {
    key = "spendingRequiresAttention";
  } else {
    key = "stableFinancialPosition";
  }

  return { key, message: { key: `${NS}.${key}`, params: {} } };
}
