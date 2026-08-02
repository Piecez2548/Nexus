import type { HeadlineKey } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

// HeadlineKey's 6 values are a synthesis of both financial-health-score
// thresholds and forecast-alert severity (see headlineBuilder.ts's own
// decision tree) — no existing color map covers it 1:1, so this is a new,
// hand-classified one, mirroring forecastAlertSeverity.ts's own file
// location/export convention.
export const HEADLINE_COLOR_CLASS: Record<HeadlineKey, string> = {
  excellentFinancialProgress: "border-green-500/40 bg-green-500/10",
  strongSavingPerformance: "border-green-500/40 bg-green-500/10",
  stableFinancialPosition: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950",
  insufficientData: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950",
  spendingRequiresAttention: "border-amber-500/40 bg-amber-500/10",
  budgetRiskDetected: "border-red-500/40 bg-red-500/10",
};
