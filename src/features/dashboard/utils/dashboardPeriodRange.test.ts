import { describe, expect, it } from "vitest";
import { getDashboardPeriodRange, getPreviousDashboardPeriodRange } from "./dashboardPeriodRange";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";

// 2026-07-21 is a Tuesday.
const now = new Date(2026, 6, 21, 12, 0, 0);

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("getDashboardPeriodRange", () => {
  it("returns just today for day", () => {
    const range = getDashboardPeriodRange("day", now);
    expect(localDateString(range.start)).toBe("2026-07-21");
    expect(localDateString(range.end)).toBe("2026-07-22");
  });

  it("returns the calendar month for month", () => {
    const range = getDashboardPeriodRange("month", now);
    expect(localDateString(range.start)).toBe("2026-07-01");
    expect(localDateString(range.end)).toBe("2026-08-01");
  });

  it("returns the calendar year for year", () => {
    const range = getDashboardPeriodRange("year", now);
    expect(localDateString(range.start)).toBe("2026-01-01");
    expect(localDateString(range.end)).toBe("2027-01-01");
  });
});

describe("getPreviousDashboardPeriodRange", () => {
  it("returns yesterday for day", () => {
    const range = getPreviousDashboardPeriodRange("day", now);
    expect(localDateString(range.start)).toBe("2026-07-20");
    expect(localDateString(range.end)).toBe("2026-07-21");
  });

  it("returns the previous calendar month for month", () => {
    const range = getPreviousDashboardPeriodRange("month", now);
    expect(localDateString(range.start)).toBe("2026-06-01");
    expect(localDateString(range.end)).toBe("2026-07-01");
  });

  it("crosses a year boundary correctly for month", () => {
    const january = new Date(2026, 0, 15);
    const range = getPreviousDashboardPeriodRange("month", january);
    expect(localDateString(range.start)).toBe("2025-12-01");
    expect(localDateString(range.end)).toBe("2026-01-01");
  });

  it("returns the previous calendar year for year", () => {
    const range = getPreviousDashboardPeriodRange("year", now);
    expect(localDateString(range.start)).toBe("2025-01-01");
    expect(localDateString(range.end)).toBe("2026-01-01");
  });
});

describe("isDateWithinRange reused with a dashboard range", () => {
  it("includes the start date and excludes the end date", () => {
    const range = getDashboardPeriodRange("day", now);
    expect(isDateWithinRange("2026-07-21", range)).toBe(true);
    expect(isDateWithinRange("2026-07-22", range)).toBe(false);
    expect(isDateWithinRange("2026-07-20", range)).toBe(false);
  });
});
