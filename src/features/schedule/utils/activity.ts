import { toMinutes, MINUTES_PER_DAY } from "@/features/schedule/utils/time";
import type { ScheduleItem } from "@/features/schedule/types";

export interface ActivityResult {
  current: ScheduleItem | null;
  // Elapsed fraction (0-100) of the current item's window — null whenever
  // `current` is null. Computed here rather than in the UI layer since it
  // shares the same effective-end derivation as the current-item lookup
  // below (an item with no explicit endTime runs until the next item).
  currentProgress: number | null;
  next: ScheduleItem | null;
  // The calendar date `next` falls on (today's date if it's later today) —
  // null whenever `next` is null. Without this, a lone recurring item can
  // show up as both "current" (in progress now) and "next" (tomorrow's
  // occurrence) with the identical title and time and no indication it's
  // a different day, which reads as a bug rather than correct behavior.
  nextDate: Date | null;
}

const MAX_LOOKAHEAD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole-day difference between two dates' calendar dates (ignoring
// time-of-day) — 0 if `to` is the same day as `from`, 1 if `to` is
// tomorrow, etc. Used to decide whether "next" needs a day qualifier
// ("today" / "tomorrow" / a weekday name) instead of just a bare time.
export function getDayOffset(from: Date, to: Date): number {
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toMidnight - fromMidnight) / MS_PER_DAY);
}

// Whether `item`'s repeat rule includes `date`'s weekday — a "daily" item
// is active every day; a "weekly" item only on its selected weekdays.
export function isActiveOnDate(item: ScheduleItem, date: Date): boolean {
  if (item.repeat.frequency === "daily") return true;
  return item.repeat.weekdays.includes(date.getDay());
}

function activeItemsOn(items: ScheduleItem[], date: Date): ScheduleItem[] {
  return items
    .filter((item) => item.enabled && isActiveOnDate(item, date))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || (a.id ?? 0) - (b.id ?? 0));
}

// Finds what's happening right now and what's coming up next, from a
// user's full (unsorted, possibly-disabled, possibly-inactive-today) list
// of schedule items.
export function getCurrentAndNext(items: ScheduleItem[], now: Date = new Date()): ActivityResult {
  const todayActive = activeItemsOn(items, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let current: ScheduleItem | null = null;
  let currentProgress: number | null = null;
  for (let i = 0; i < todayActive.length; i++) {
    const item = todayActive[i];
    const start = toMinutes(item.startTime);
    // An item with no explicit endTime runs until the next item starts (or
    // midnight if it's the last one) — endTime is only ever needed to
    // deliberately leave a gap, never just to make "current" work.
    const followingItem = todayActive[i + 1];
    const end = item.endTime != null ? toMinutes(item.endTime) : followingItem ? toMinutes(followingItem.startTime) : MINUTES_PER_DAY;

    if (nowMinutes >= start && nowMinutes < end) {
      current = item;
      currentProgress = ((nowMinutes - start) / (end - start)) * 100;
      break;
    }
  }

  let next: ScheduleItem | null = todayActive.find((item) => toMinutes(item.startTime) > nowMinutes) ?? null;
  let nextDate: Date | null = next ? now : null;

  if (next === null) {
    for (let dayOffset = 1; dayOffset <= MAX_LOOKAHEAD_DAYS; dayOffset++) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + dayOffset);

      const [earliest] = activeItemsOn(items, futureDate);
      if (earliest) {
        next = earliest;
        nextDate = futureDate;
        break;
      }
    }
  }

  return { current, currentProgress, next, nextDate };
}
