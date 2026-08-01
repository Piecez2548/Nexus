// Per-responder answer confidence — a separate axis from the classifier's
// own confidence (see classifyIntent.ts), blended together in
// coachConfidenceCalculator.ts. Mirrors the "named constants, clamp
// 0-100" shape every other calculator in this app uses.

const DEFAULT_ANSWER_CONFIDENCE = 90;
// Reserved for genuine no-data cases (e.g. 0 transactions in a domain) —
// never used just because an answer is narrower than what was asked; that
// case uses `ceiling` instead, since the numbers given there are still
// exact and reliable.
const NO_DATA_CONFIDENCE = 0;
const INSUFFICIENT_DATA_PENALTY = 25;
const THIN_SAMPLE_PENALTY = 15;
const THIN_SAMPLE_THRESHOLD = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface AnswerConfidenceInput {
  hasData: boolean; // false when the specific denominator is empty (0 transactions/goals/budgets)
  insufficientData?: boolean; // the source itself flags insufficientData / basis==="insufficientData" / paceKnown===false
  sampleSize?: number; // count backing a trend/behavior claim, if applicable
  // An honesty-path cap for answers that are inherently narrower than what
  // was likely asked (e.g. Income Analysis has no source breakdown) — the
  // numbers given are still exact, so this isn't NO_DATA_CONFIDENCE, just
  // a lower ceiling than a fully-answered question would get.
  ceiling?: number;
}

export function computeAnswerConfidence(input: AnswerConfidenceInput): number {
  if (!input.hasData) return NO_DATA_CONFIDENCE;

  let confidence = DEFAULT_ANSWER_CONFIDENCE;
  if (input.insufficientData) confidence -= INSUFFICIENT_DATA_PENALTY;
  if (input.sampleSize !== undefined && input.sampleSize < THIN_SAMPLE_THRESHOLD) confidence -= THIN_SAMPLE_PENALTY;

  const ceiling = input.ceiling ?? 100;
  return clamp(Math.round(Math.min(confidence, ceiling)), 0, 100);
}
