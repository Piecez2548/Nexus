export const MINUTES_PER_DAY = 24 * 60;

export function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Subtracts `minutes` from a "HH:mm" time-of-day, clamped at "00:00" —
// a reminder offset is never meant to roll back into the previous day.
export function subtractMinutes(time: string, minutes: number): string {
  const total = Math.max(0, toMinutes(time) - minutes);
  return minutesToTime(total);
}
