import { computeForecastProfile } from "@/features/finance/aiAnalytics/engine/forecast/engine/computeForecastProfile";
import type { ForecastEngine } from "@/features/finance/aiAnalytics/engine/forecast/types";

// The future-AI seam's local implementation, mirroring localBehaviorEngine.ts/
// localStatisticalEngine.ts's own "resolved Promise wrapping a synchronous
// computation" pattern — a future Claude/OpenAI/Gemini/Ollama-backed
// implementation of ForecastEngine can replace this with zero changes to
// any call site.
export const localForecastEngine: ForecastEngine = {
  forecast: (context) => Promise.resolve(computeForecastProfile(context)),
};
