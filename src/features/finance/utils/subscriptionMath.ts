import { addDays, addWeeks, addMonths, addYears, subDays, startOfMonth, setDate, getDaysInMonth } from "date-fns";

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

// Only monthly/yearly have a day-of-month that can be clamped by a shorter
// target month -- daily/weekly never do (every day exists in every week),
// so a billing anchor is meaningless for them.
const ADVANCE_MONTH_UNIT_BY: Partial<Record<RecurringFrequency, (date: Date) => Date>> = {
  monthly: (d) => addMonths(d, 1),
  yearly: (d) => addYears(d, 1),
};

// The day of the month this subscription is meant to bill on, independent
// of whatever day its stored nextBillingDate currently shows (BUG-12: see
// advanceOneBillingCycle's own comment for why those two can differ). Falls
// back to nextBillingDate's own day for a subscription created before
// Subscription.billingAnchorDay existed -- if that stored date had ALREADY
// clamped/drifted before this fix shipped, the true original anchor is
// genuinely unrecoverable (no field anywhere still holds it), so the
// fallback is honestly just "whatever day it shows today," not a recovered
// original. Every code path that actually advances a subscription now
// persists this once resolved, so the fallback only ever applies to a
// legacy record's very first advance after upgrading.
export function anchorDayFromNextBillingDate(nextBillingDate: string): number {
  return parseLocalDate(nextBillingDate).getDate();
}

export function resolveBillingAnchorDay(nextBillingDate: string, billingAnchorDay: number | undefined): number {
  return billingAnchorDay ?? anchorDayFromNextBillingDate(nextBillingDate);
}

// The single-step calendar advance shared by resolveNextBillingDate's
// display-only rolling below and subscriptionTransactionService's explicit
// write-path advance after generating a transaction for a due cycle.
//
// `anchorDay`, when given, is the day-of-month billing is meant to land on
// -- e.g. 31 for a subscription billed on the last day of a long month.
// Without it (the default), a single call reproduces exactly the clamping
// date-fns has always done (Jan 31 -> Feb 28), which is correct in
// isolation -- nobody could have "Feb 31." BUG-12 was what happened on the
// NEXT step: computing that step from the already-clamped "Feb 28" lost the
// "31" forever, permanently rebasing every future cycle down to the 28th.
// Passing the ORIGINAL anchor through on every call (as
// subscriptionTransactionService's catch-up loop and
// resolveNextBillingDate's rolling loop both now do) keeps the true billing
// day recoverable the moment the calendar allows it again:
// 31 Jan -> 28 Feb -> 31 Mar -> 30 Apr -> 31 May, not 28 Feb -> 28 Mar -> 28 Apr...
//
// Always resolved from `startOfMonth` first, then re-clamped fresh against
// the ANCHOR (not the input date's own day) -- this is what keeps the
// answer independent of whether `date` itself is already a clamped value.
export function advanceOneBillingCycle(date: string, frequency: RecurringFrequency, anchorDay?: number): string {
  const advanceMonthUnit = ADVANCE_MONTH_UNIT_BY[frequency];
  if (!advanceMonthUnit) return toLocalDateString(ADVANCE_BY[frequency](parseLocalDate(date)));

  const current = parseLocalDate(date);
  const anchor = anchorDay ?? current.getDate();
  const targetMonthStart = advanceMonthUnit(startOfMonth(current));
  const daysInTarget = getDaysInMonth(targetMonthStart);
  return toLocalDateString(setDate(targetMonthStart, Math.min(anchor, daysInTarget)));
}

// Rolls a subscription's stored nextBillingDate forward to the first
// occurrence on or after `asOf`, purely for display -- never written back
// to storage. A subscription due in the past is still legitimately "next
// due" on its very next natural occurrence, so there's nothing to silently
// duplicate or drift out of sync by not persisting the roll-forward.
//
// `billingAnchorDay` is resolved ONCE up front and threaded unchanged into
// every `advanceOneBillingCycle` call in the loop below -- resolving it
// fresh on each iteration would re-derive it from whatever day the
// previous iteration's (possibly clamped) result landed on, silently
// reintroducing BUG-12 inside this loop alone.
export function resolveNextBillingDate(
  nextBillingDate: string,
  frequency: RecurringFrequency,
  asOf: Date = new Date(),
  billingAnchorDay?: number
): string {
  const today = toLocalDateString(asOf);
  const anchor = resolveBillingAnchorDay(nextBillingDate, billingAnchorDay);

  let date = nextBillingDate;
  // Bounded to guard against a malformed stored date/frequency looping
  // forever -- 1000 iterations covers over 2 years even at the finest
  // (daily) granularity, far more than this ever needs in practice.
  for (let i = 0; i < 1000 && date < today; i++) {
    date = advanceOneBillingCycle(date, frequency, anchor);
  }

  return date;
}

// Whole days until the resolved next billing date (negative if somehow
// still in the past after resolution, which shouldn't happen but is
// reported honestly rather than clamped).
export function daysUntil(dateString: string, asOf: Date = new Date()): number {
  const target = parseLocalDate(dateString);
  const from = parseLocalDate(toLocalDateString(asOf));
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// 1 day before nextBillingDate, fixed at 09:00 local -- a stated
// simplification (see Subscription.reminderEnabled's own comment), no
// per-subscription time-of-day picker.
export function reminderFireTime(nextBillingDate: string): Date {
  const at = subDays(parseLocalDate(nextBillingDate), 1);
  at.setHours(9, 0, 0, 0);
  return at;
}
