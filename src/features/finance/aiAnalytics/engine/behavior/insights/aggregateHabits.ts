// Pure aggregation of the unified DetectedHabit[] list by polarity —
// mirrors Prompt 005's aggregateExplanations.ts pattern exactly (bucket
// already-built findings, invent zero new messages at this level).

import type { BehaviorMessage, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

export interface AggregatedHabits {
  positiveHabits: DetectedHabit[];
  negativeHabits: DetectedHabit[];
  improvementOpportunities: BehaviorMessage[];
}

// Negative habits below this confidence are too uncertain to present as an
// actionable "improvement opportunity" — they still show up in
// negativeHabits, just not duplicated into this more prescriptive bucket.
const IMPROVEMENT_CONFIDENCE_THRESHOLD = 50;

export function aggregateHabits(habits: DetectedHabit[]): AggregatedHabits {
  const positiveHabits = habits.filter((h) => h.polarity === "positive");
  const negativeHabits = habits.filter((h) => h.polarity === "negative");
  const improvementOpportunities = negativeHabits.filter((h) => h.confidence >= IMPROVEMENT_CONFIDENCE_THRESHOLD).map((h) => h.message);

  return { positiveHabits, negativeHabits, improvementOpportunities };
}
