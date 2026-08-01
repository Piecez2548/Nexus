// Async wrapper around the synchronous computeCoachResponse — exists purely
// as the future-AI-provider seam described in the spec's FUTURE SUPPORT
// section (a swappable response engine interface). The current UI calls
// computeCoachResponse directly and does not use this wrapper, exactly like
// useCategoryDetail/simulateScenario's own on-demand precedent: an already-
// instant local computation needs no await or loading state.

import { computeCoachResponse } from "@/features/finance/aiAnalytics/engine/coach/engine/askCoach";
import type { CoachEngine, CoachEngineContext, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

export const localCoachEngine: CoachEngine = {
  ask(context: CoachEngineContext): Promise<CoachResponse> {
    return Promise.resolve(computeCoachResponse(context));
  },
};
