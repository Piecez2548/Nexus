// Blends the classifier's own confidence (how sure it is this is the
// right intent) with the responder's answer confidence (how sure the
// answer itself is), mirroring executiveSummaryConfidenceCalculator.ts's
// exact "named constants, clamp 0-100" shape. The "unknown" intent never
// reaches this calculator — the orchestrator (engine/askCoach.ts)
// short-circuits it to a hardcoded 0 instead, since there's no answer to
// be confident about.

import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";

const CLASSIFIER_CONFIDENCE_WEIGHT = 0.3;
const ANSWER_CONFIDENCE_WEIGHT = 0.7; // weights sum to 1.0

export function calculateCoachConfidence(classifierConfidence: number, answerConfidence: number): number {
  const blended = classifierConfidence * CLASSIFIER_CONFIDENCE_WEIGHT + answerConfidence * ANSWER_CONFIDENCE_WEIGHT;
  return clamp(Math.round(blended), 0, 100);
}
