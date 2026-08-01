export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Average days/month — used wherever a ฿/day pace needs converting to/from
// a ฿/month figure (goal pace, what-if scenario projections).
export const AVERAGE_DAYS_PER_MONTH = 30.44;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
