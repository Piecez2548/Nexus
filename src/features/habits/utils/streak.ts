import type { HabitFrequency } from "@/features/habits/types";

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parsed and rebuilt as a local calendar date — `new Date(dateString)`
// parses as UTC midnight, which drifts across a day boundary relative to
// locally-constructed dates in any non-UTC timezone (see periodRange.ts).
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

// Monday-anchored week start, matching periodRange.ts's startOfWeek so a
// habit's weekly bucket lines up with the rest of the app's week boundary.
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  return result;
}

export function isCompletedToday(completedDates: string[], today: Date = new Date()): boolean {
  return completedDates.includes(toLocalDateString(today));
}

// Current streak, counted in units of the habit's own frequency (consecutive
// days for "daily", consecutive Monday-anchored weeks for "weekly"). Grace
// period: if the current unit (today / this week) hasn't been checked in
// yet, the streak still counts back from the last completed unit instead of
// resetting to 0 immediately — otherwise a streak would show as broken every
// morning before that day's check-in happens.
export function computeStreak(
  completedDates: string[],
  frequency: HabitFrequency,
  today: Date = new Date()
): number {
  if (completedDates.length === 0) return 0;

  const step = frequency === "daily" ? 1 : 7;
  const bucketOf = (date: Date) => (frequency === "daily" ? date : startOfWeek(date));
  const buckets = new Set(completedDates.map((d) => toLocalDateString(bucketOf(parseLocalDate(d)))));

  let cursor = bucketOf(today);
  if (!buckets.has(toLocalDateString(cursor))) {
    cursor = addDays(cursor, -step);
    if (!buckets.has(toLocalDateString(cursor))) return 0;
  }

  let streak = 0;
  while (buckets.has(toLocalDateString(cursor))) {
    streak++;
    cursor = addDays(cursor, -step);
  }
  return streak;
}

// Last `days` calendar dates ending today, oldest first — for a fixed-length
// recent-history dot strip regardless of frequency (a weekly habit simply
// shows fewer filled dots in the same window).
export function getRecentDates(days: number, today: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => toLocalDateString(addDays(today, -(days - 1 - i))));
}
