import { computeExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/engine/computeExecutiveSummaryReport";
import type { ExecutiveSummaryEngine } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

// The future-AI seam's local implementation, mirroring localForecastEngine.ts/
// localBehaviorEngine.ts's own "resolved Promise wrapping a synchronous
// computation" pattern — a future Claude/OpenAI/Gemini/Ollama-backed
// implementation of ExecutiveSummaryEngine can replace this with zero
// changes to any call site.
export const localExecutiveSummaryEngine: ExecutiveSummaryEngine = {
  generate: (context) => Promise.resolve(computeExecutiveSummaryReport(context)),
};
