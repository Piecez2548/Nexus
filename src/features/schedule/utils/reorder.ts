import { toMinutes, minutesToTime, MINUTES_PER_DAY } from "@/features/schedule/utils/time";

const MIN_GAP_MINUTES = 1;
const DEFAULT_GAP_MINUTES = 30;
const FALLBACK_TIME_MINUTES = 12 * 60; // "12:00" — no neighbors to anchor to at all

// Derives a new startTime for an item dragged strictly between two
// neighbors on the timeline — dragging and editing the time field are the
// same underlying operation, since the timeline is always sorted by
// startTime (no independent manual sort order to keep in sync).
export function deriveTimeBetween(before: string | null, after: string | null): string {
  const beforeMinutes = before !== null ? toMinutes(before) : null;
  const afterMinutes = after !== null ? toMinutes(after) : null;

  let result: number;
  if (beforeMinutes !== null && afterMinutes !== null) {
    const midpoint = Math.floor((beforeMinutes + afterMinutes) / 2);
    result = Math.max(beforeMinutes + MIN_GAP_MINUTES, Math.min(midpoint, afterMinutes - MIN_GAP_MINUTES));
  } else if (beforeMinutes !== null) {
    result = beforeMinutes + DEFAULT_GAP_MINUTES;
  } else if (afterMinutes !== null) {
    result = afterMinutes - DEFAULT_GAP_MINUTES;
  } else {
    result = FALLBACK_TIME_MINUTES;
  }

  result = Math.max(0, Math.min(MINUTES_PER_DAY - 1, result));
  return minutesToTime(result);
}
