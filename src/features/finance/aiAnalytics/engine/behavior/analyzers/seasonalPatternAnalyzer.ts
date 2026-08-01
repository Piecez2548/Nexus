// Genuinely new: buckets the current month's expense transactions by
// day-of-month into thirds. No existing utility does day-of-month
// bucketing (confirmed against periodRange.ts/cashFlowMath.ts).

import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import { parseLocalDate } from "@/utils/localDate";
import type { Transaction } from "@/features/finance/types";
import type { MonthPhase, SeasonalPatternResult } from "@/features/finance/aiAnalytics/engine/behavior/types";

const BEGINNING_END_DAY = 10;
const MIDDLE_END_DAY = 20;
// How far above an equal three-way split (33.3%) the top phase's own share
// must be before it counts as genuinely "dominant" rather than "even" —
// a 34/33/33 split isn't a real pattern, just noise.
const DOMINANT_MARGIN_PERCENT = 15;

export function analyzeSeasonalPattern(transactions: Transaction[], now: Date): SeasonalPatternResult {
  const range = getCurrentPeriodRange("monthly", now);
  const monthExpenses = transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, range));

  let beginning = 0;
  let middle = 0;
  let end = 0;
  for (const t of monthExpenses) {
    const day = parseLocalDate(t.date).getDate();
    if (day <= BEGINNING_END_DAY) beginning += t.amount;
    else if (day <= MIDDLE_END_DAY) middle += t.amount;
    else end += t.amount;
  }

  const total = beginning + middle + end;
  let dominantPhase: MonthPhase | "even" = "even";
  if (total > 0) {
    const shares: [MonthPhase, number][] = [
      ["beginning", beginning],
      ["middle", middle],
      ["end", end],
    ];
    const [topPhase, topAmount] = shares.reduce((max, s) => (s[1] > max[1] ? s : max));
    const topSharePercent = (topAmount / total) * 100;
    dominantPhase = topSharePercent >= 100 / 3 + DOMINANT_MARGIN_PERCENT ? topPhase : "even";
  }

  return { beginning, middle, end, dominantPhase };
}
