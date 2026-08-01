import type { BudgetPeriod } from "../types";

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // days since Monday
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

// The current period's date range for a given budget cadence, used to
// filter transactions when computing actual spend against a budget.
export function getCurrentPeriodRange(period: BudgetPeriod, now = new Date()): PeriodRange {
  if (period === "weekly") {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (period === "yearly") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export function isDateWithinRange(dateStr: string, range: PeriodRange): boolean {
  // Parse as local calendar date, not UTC — `new Date("YYYY-MM-DD")` parses
  // as UTC midnight, which would drift across a day boundary relative to
  // the locally-constructed range above for any non-UTC timezone.
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date >= range.start && date < range.end;
}
