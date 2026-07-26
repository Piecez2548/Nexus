export type DashboardPeriodGranularity = "day" | "month" | "year";

export interface DashboardPeriodRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// The current period's date range for the Dashboard's day/month/year
// selector — deliberately separate from finance's BudgetPeriod (which has
// no "daily" option and is driven independently by each budget's own
// cadence), even though the underlying range math is similar in shape.
export function getDashboardPeriodRange(granularity: DashboardPeriodGranularity, now = new Date()): DashboardPeriodRange {
  if (granularity === "day") {
    const start = startOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (granularity === "year") {
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

// The immediately preceding period of the same length, used for "vs previous
// period" percentage comparisons.
export function getPreviousDashboardPeriodRange(granularity: DashboardPeriodGranularity, now = new Date()): DashboardPeriodRange {
  if (granularity === "day") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return getDashboardPeriodRange("day", yesterday);
  }

  if (granularity === "year") {
    return getDashboardPeriodRange("year", new Date(now.getFullYear() - 1, 0, 1));
  }

  return getDashboardPeriodRange("month", new Date(now.getFullYear(), now.getMonth() - 1, 1));
}
