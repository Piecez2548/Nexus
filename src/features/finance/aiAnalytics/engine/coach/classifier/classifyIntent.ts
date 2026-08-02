// Rule-based (explicitly NOT machine learning, per the spec) intent
// classifier. Mirrors engine/analyzers/behaviorAnalysis.ts's own
// matchesAnyKeyword() substring strategy, applied one level up: matching
// free-text QUESTIONS against COACH_INTENT_KEYWORDS instead of matching
// transaction fields against BEHAVIOR_KEYWORDS.

import { COACH_INTENT_KEYWORDS, INTENT_PRIORITY_ORDER } from "@/features/finance/aiAnalytics/engine/coach/constants/coachIntentKeywords";
import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import type { CoachIntent, IntentMatch } from "@/features/finance/aiAnalytics/engine/coach/types";

const CLASSIFIER_BASE_CONFIDENCE = 50;
// Per point of score gap over the runner-up, capped — a wider lead between
// the top match and everything else reads as more certain.
const CLASSIFIER_MARGIN_WEIGHT = 10;
const CLASSIFIER_MARGIN_CAP = 40;
const CLASSIFIER_TIE_BREAK_PENALTY = 20;
// Keyword matching is never claimed as full certainty, even at its best.
const CLASSIFIER_MAX_CONFIDENCE = 95;

interface IntentScore {
  intent: CoachIntent;
  score: number;
  matchedKeywords: string[];
}

const ALL_INTENTS = Object.keys(COACH_INTENT_KEYWORDS) as CoachIntent[];

// Score = sum of matched keyword string lengths, not just a match count —
// a longer, more specific phrase ("will i exceed my budget") naturally
// outweighs a short generic word ("budget") that happens to also appear in
// a different intent's own vocabulary, resolving ambiguity without any
// extra tuning logic.
function scoreIntent(lowerQuestion: string, intent: CoachIntent): IntentScore {
  const matchedKeywords = COACH_INTENT_KEYWORDS[intent].filter((keyword) => lowerQuestion.includes(keyword.toLowerCase()));
  const score = matchedKeywords.reduce((sum, keyword) => sum + keyword.length, 0);
  return { intent, score, matchedKeywords };
}

export function classifyIntent(questionText: string): IntentMatch {
  const lowerQuestion = questionText.toLowerCase();
  const scores = ALL_INTENTS.map((intent) => scoreIntent(lowerQuestion, intent));
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0];

  if (top.score === 0) {
    return { intent: "unknown", score: 0, confidence: 0, matchedKeywords: [], wasTieBroken: false };
  }

  const tiedAtTop = sorted.filter((s) => s.score === top.score);
  const wasTieBroken = tiedAtTop.length > 1;
  const winner = wasTieBroken
    ? tiedAtTop.reduce((best, s) => (INTENT_PRIORITY_ORDER.indexOf(s.intent) < INTENT_PRIORITY_ORDER.indexOf(best.intent) ? s : best))
    : top;

  const gap = top.score - (sorted[1]?.score ?? 0);
  const marginBonus = clamp(gap * CLASSIFIER_MARGIN_WEIGHT, 0, CLASSIFIER_MARGIN_CAP);
  const tieAdjustment = wasTieBroken ? -CLASSIFIER_TIE_BREAK_PENALTY : 0;
  const confidence = clamp(Math.round(CLASSIFIER_BASE_CONFIDENCE + marginBonus + tieAdjustment), 0, CLASSIFIER_MAX_CONFIDENCE);

  return { intent: winner.intent, score: winner.score, confidence, matchedKeywords: winner.matchedKeywords, wasTieBroken };
}
