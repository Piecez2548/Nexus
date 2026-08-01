// Synchronous orchestrator: classify -> dispatch to the matching responder
// -> attach intent/nextSuggestedQuestion centrally (so no individual
// responder can let its own intent literal drift from the registry key)
// -> blend the responder's answer confidence with the classifier's own
// confidence. Named computeCoachResponse to match the established
// compute*Profile/compute*Report naming used by every prior prompt's
// top-level entry point (computeForecastProfile, computeExecutiveSummaryReport).

import { classifyIntent } from "@/features/finance/aiAnalytics/engine/coach/classifier/classifyIntent";
import { RESPONDER_REGISTRY } from "@/features/finance/aiAnalytics/engine/coach/responders/responderRegistry";
import { calculateCoachConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/coachConfidenceCalculator";
import { NEXT_QUESTION_BY_INTENT, EXAMPLE_QUESTION_KEY_BY_INTENT } from "@/features/finance/aiAnalytics/engine/coach/constants/nextQuestionMap";
import type { CoachEngineContext, CoachResponse, CoachSuggestion } from "@/features/finance/aiAnalytics/engine/coach/types";

function buildNextSuggestedQuestion(intent: keyof typeof NEXT_QUESTION_BY_INTENT): CoachSuggestion {
  const nextIntent = NEXT_QUESTION_BY_INTENT[intent];
  return { intent: nextIntent, prompt: { key: EXAMPLE_QUESTION_KEY_BY_INTENT[nextIntent], params: {} } };
}

export function computeCoachResponse(context: CoachEngineContext): CoachResponse {
  const match = classifyIntent(context.questionText);

  if (match.intent === "unknown") {
    return {
      intent: "unknown",
      answer: { key: "aiAnalytics.aiCoach.unknown.answer", params: {} },
      supportingMetrics: {},
      reason: { key: "aiAnalytics.aiCoach.unknown.reason", params: {} },
      confidence: 0,
      relatedRecommendations: [],
      nextSuggestedQuestion: null,
    };
  }

  const responder = RESPONDER_REGISTRY[match.intent];
  const partial = responder(context.data);
  const confidence = calculateCoachConfidence(match.confidence, partial.confidence);

  return {
    ...partial,
    intent: match.intent,
    confidence,
    nextSuggestedQuestion: buildNextSuggestedQuestion(match.intent),
  };
}
