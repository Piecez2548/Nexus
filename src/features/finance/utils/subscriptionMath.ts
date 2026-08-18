import { addDays, addWeeks, addMonths, addYears } from "date-fns";

import { MONTHLY_MULTIPLIER } from "@/features/finance/hooks/useSubscriptions";
import { parseLocalDate, toLocalDateString } from "@/utils/localDate";
import type { RecurringFrequency, Subscription } from "@/features/finance/types";

export function monthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  return amount * MONTHLY_MULTIPLIER[frequency];
}

export interface SubscriptionStats {
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  totalMonthly: number;
  totalYearly: number;
}

// Paused/cancelled subscriptions don't count toward current spend -- kept
// in the list (not deleted) purely as an easy-to-reactivate or historical
// record, so a status change is what moves a subscription in or out of the
// total, not deleting/re-adding it.
export function calculateSubscriptionStats(subscriptions: Subscription[]): SubscriptionStats {
  const active = subscriptions.filter((s) => s.status === "active");
  const totalMonthly = active.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingFrequency), 0);

  return {
    activeCount: active.length,
    pausedCount: subscriptions.filter((s) => s.status === "paused").length,
    cancelledCount: subscriptions.filter((s) => s.status === "cancelled").length,
    totalMonthly,
    totalYearly: totalMonthly * 12,
  };
}

const ADVANCE_BY: Record<RecurringFrequency, (date: Date) => Date> = {
  daily: (d) => addDays(d, 1),
  weekly: (d) => addWeeks(d, 1),
  monthly: (d) => addMonths(d, 1),
  yearly: (d) => addYears(d, 1),
};

// Rolls a subscription's stored nextBillingDate forward to the first
// occurrence on or after `asOf`, purely for display -- never written back
// to storage. A subscription due in the past is still legitimately "next
// due" on its very next natural occurrence (correctly handling calendar
// edge cases like Jan 31 -> Feb 28 via date-fns's addMonths, not naive day
// arithmetic), so there's nothing to silently duplicate or drift out of
// sync by not persisting the roll-forward.
export function resolveNextBillingDate(
  nextBillingDate: string,
  frequency: RecurringFrequency,
  asOf: Date = new Date()
): string {
  const advance = ADVANCE_BY[frequency];
  const today = toLocalDateString(asOf);

  let date = parseLocalDate(nextBillingDate);
  // Bounded to guard against a malformed stored date/frequency looping
  // forever -- 1000 iterations covers over 2 years even at the finest
  // (daily) granularity, far more than this ever needs in practice.
  for (let i = 0; i < 1000 && toLocalDateString(date) < today; i++) {
    date = advance(date);
  }

  return toLocalDateString(date);
}

// Whole days until the resolved next billing date (negative if somehow
// still in the past after resolution, which shouldn't happen but is
// reported honestly rather than clamped).
export function daysUntil(dateString: string, asOf: Date = new Date()): number {
  const target = parseLocalDate(dateString);
  const from = parseLocalDate(toLocalDateString(asOf));
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
