// Tiny shared math used by both spendingStyleClassifier.ts and
// behaviorScoreCalculator.ts — they're conceptually parallel calculators
// (neither depends on the other), so this is their common home rather than
// one importing from the other.

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 0-100, reaching 100 once `amount` is `fullScoreSharePercent`% (or more)
// of `total`.
export function shareScore(amount: number, total: number, fullScoreSharePercent: number): number {
  if (total <= 0) return 0;
  const sharePercent = (amount / total) * 100;
  return clamp((sharePercent / fullScoreSharePercent) * 100, 0, 100);
}
