import { describe, expect, it } from "vitest";
import { getCurrentPeriodRange, isDateWithinRange } from "./periodRange";

// 2026-07-21 is a Tuesday.
const now = new Date(2026, 6, 21, 12, 0, 0);

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("getCurrentPeriodRange", () => {
  it("returns the calendar month for monthly", () => {
    const range = getCurrentPeriodRange("monthly", now);
    expect(localDateString(range.start)).toBe("2026-07-01");
    expect(localDateString(range.end)).toBe("2026-08-01");
  });

  it("returns the calendar year for yearly", () => {
    const range = getCurrentPeriodRange("yearly", now);
    expect(localDateString(range.start)).toBe("2026-01-01");
    expect(localDateString(range.end)).toBe("2027-01-01");
  });

  it("returns the Monday-Sunday week for weekly", () => {
    const range = getCurrentPeriodRange("weekly", now);
    expect(localDateString(range.start)).toBe("2026-07-20"); // Monday
    expect(localDateString(range.end)).toBe("2026-07-27"); // next Monday
  });
});

describe("isDateWithinRange", () => {
  it("includes the start date and excludes the end date", () => {
    const range = getCurrentPeriodRange("monthly", now);
    expect(isDateWithinRange("2026-07-01", range)).toBe(true);
    expect(isDateWithinRange("2026-07-31", range)).toBe(true);
    expect(isDateWithinRange("2026-08-01", range)).toBe(false);
    expect(isDateWithinRange("2026-06-30", range)).toBe(false);
  });
});
