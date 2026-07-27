import type { CalendarEvent, CalendarRecurrenceFrequency } from "@/features/calendar/types";

// Parsed and rebuilt as a local date-time — `new Date(str)` parses a
// date-only string as UTC midnight, which drifts across a day boundary
// relative to locally-constructed dates in any non-UTC timezone (see
// src/features/habits/utils/streak.ts for the same discipline applied to
// date-only strings).
export function parseLocalDateTime(dateTimeString: string): Date {
  const [datePart, timePart = "00:00"] = dateTimeString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Advances one recurrence interval. Monthly/yearly clamp to the last day of
// a shorter target month (Jan 31 + 1 month -> Feb 28/29) instead of letting
// JS's setMonth/setFullYear roll over into the following month — purely for
// what the calendar *displays*; native reminder scheduling has its own,
// separately-accepted quirk for this same edge case (see reminderService).
export function advanceByFrequency(date: Date, frequency: CalendarRecurrenceFrequency): Date {
  const result = new Date(date);

  if (frequency === "daily") {
    result.setDate(result.getDate() + 1);
    return result;
  }

  if (frequency === "weekly") {
    result.setDate(result.getDate() + 7);
    return result;
  }

  const day = result.getDate();

  if (frequency === "monthly") {
    const targetMonthIndex = result.getMonth() + 1;
    const targetYear = result.getFullYear() + Math.floor(targetMonthIndex / 12);
    const targetMonth = targetMonthIndex % 12;
    result.setFullYear(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
    return result;
  }

  // yearly
  const targetYear = result.getFullYear() + 1;
  const month = result.getMonth();
  result.setFullYear(targetYear, month, Math.min(day, daysInMonth(targetYear, month)));
  return result;
}

// Every occurrence of `event` that falls within [rangeStart, rangeEnd) —
// used by the month grid and the Dashboard preview panel. Skips ahead by
// whole intervals rather than one-at-a-time when the anchor is far in the
// past, bounded by a safety cap so a malformed/ancient anchor can't hang.
export function getOccurrencesInRange(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  const anchor = parseLocalDateTime(event.startAt);

  if (!event.recurring) {
    return anchor >= rangeStart && anchor < rangeEnd ? [anchor] : [];
  }

  const frequency = event.recurring.frequency;
  let cursor = anchor;

  let guard = 0;
  while (cursor < rangeStart && guard < 100000) {
    cursor = advanceByFrequency(cursor, frequency);
    guard++;
  }

  const occurrences: Date[] = [];
  guard = 0;
  while (cursor < rangeEnd && guard < 10000) {
    if (cursor >= rangeStart) occurrences.push(cursor);
    cursor = advanceByFrequency(cursor, frequency);
    guard++;
  }

  return occurrences;
}

// The first occurrence at or after `now` — used once, to seed the initial
// native notification fire time (the OS's own repeat schedule takes over
// from there; see reminderService.ts).
export function getNextOccurrence(event: CalendarEvent, now: Date = new Date()): Date | null {
  const anchor = parseLocalDateTime(event.startAt);

  if (!event.recurring) {
    return anchor >= now ? anchor : null;
  }

  const frequency = event.recurring.frequency;
  let cursor = anchor;
  let guard = 0;
  while (cursor < now && guard < 100000) {
    cursor = advanceByFrequency(cursor, frequency);
    guard++;
  }
  return cursor;
}
