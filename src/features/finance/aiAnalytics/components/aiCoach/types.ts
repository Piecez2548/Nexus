import type { CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

// Ephemeral page-local chat history — lost on reload, matching
// CategoryInsightsDrawer's own page-local-state precedent. Nothing is
// lost since every response is perfectly re-derivable from already-loaded
// FinancialAnalysisResult data.
export interface CoachExchange {
  id: string;
  question: string;
  response: CoachResponse;
}
