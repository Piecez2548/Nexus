import { describe, expect, it } from "vitest";
import {
  parseLocalDateTime,
  advanceByFrequency,
  getOccurrencesInRange,
  getNextOccurrence,
} from "./recurrence";
import type { CalendarEvent } from "@/features/calendar/types";

function sample(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    title: "Meeting",
    startAt: "2026-07-15T09:00",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("parseLocalDateTime", () => {
  it("parses a date-time string as local time, not UTC", () => {
    const date = parseLocalDateTime("2026-07-15T09:30");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // July, 0-indexed
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(30);
  });

  it("defaults to midnight when no time part is given", () => {
    const date = parseLocalDateTime("2026-07-15");
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });
});

describe("advanceByFrequency", () => {
  it("advances daily by one day", () => {
    const next = advanceByFrequency(new Date(2026, 6, 15, 9, 0), "daily");
    expect(next).toEqual(new Date(2026, 6, 16, 9, 0));
  });

  it("advances weekly by seven days", () => {
    const next = advanceByFrequency(new Date(2026, 6, 15, 9, 0), "weekly");
    expect(next).toEqual(new Date(2026, 6, 22, 9, 0));
  });

  it("advances monthly, clamping to the last day of a shorter target month", () => {
    const next = advanceByFrequency(new Date(2026, 0, 31, 10, 0), "monthly"); // Jan 31
    expect(next).toEqual(new Date(2026, 1, 28, 10, 0)); // Feb 28 (2026 not a leap year)
  });

  it("advances monthly across a year boundary", () => {
    const next = advanceByFrequency(new Date(2026, 11, 31, 10, 0), "monthly"); // Dec 31
    expect(next).toEqual(new Date(2027, 0, 31, 10, 0)); // Jan 31 next year
  });

  it("advances yearly, clamping Feb 29 to Feb 28 in a non-leap target year", () => {
    const next = advanceByFrequency(new Date(2028, 1, 29, 8, 0), "yearly"); // 2028 is a leap year
    expect(next).toEqual(new Date(2029, 1, 28, 8, 0)); // 2029 is not
  });
});

describe("getOccurrencesInRange", () => {
  it("returns the single occurrence of a non-recurring event when it falls in range", () => {
    const event = sample({ startAt: "2026-07-15T09:00" });
    const occurrences = getOccurrencesInRange(event, new Date(2026, 6, 1), new Date(2026, 7, 1));
    expect(occurrences).toEqual([new Date(2026, 6, 15, 9, 0)]);
  });

  it("returns nothing for a non-recurring event outside the range", () => {
    const event = sample({ startAt: "2026-08-15T09:00" });
    const occurrences = getOccurrencesInRange(event, new Date(2026, 6, 1), new Date(2026, 7, 1));
    expect(occurrences).toEqual([]);
  });

  it("expands a daily recurring event to every day in range", () => {
    const event = sample({ startAt: "2026-07-01T09:00", recurring: { frequency: "daily" } });
    const occurrences = getOccurrencesInRange(event, new Date(2026, 6, 5), new Date(2026, 6, 8));
    expect(occurrences.map((d) => d.getDate())).toEqual([5, 6, 7]);
  });

  it("expands a weekly recurring event across a month boundary", () => {
    const event = sample({ startAt: "2026-07-20T09:00", recurring: { frequency: "weekly" } });
    const occurrences = getOccurrencesInRange(event, new Date(2026, 6, 1), new Date(2026, 7, 15));
    // Jul 20, Jul 27, Aug 3, Aug 10
    expect(occurrences.map((d) => `${d.getMonth() + 1}-${d.getDate()}`)).toEqual(["7-20", "7-27", "8-3", "8-10"]);
  });

  it("returns nothing when a recurring event's anchor is entirely after the range", () => {
    const event = sample({ startAt: "2026-09-01T09:00", recurring: { frequency: "monthly" } });
    const occurrences = getOccurrencesInRange(event, new Date(2026, 6, 1), new Date(2026, 7, 1));
    expect(occurrences).toEqual([]);
  });
});

describe("getNextOccurrence", () => {
  it("returns the anchor itself for a non-recurring future event", () => {
    const event = sample({ startAt: "2026-07-20T09:00" });
    const next = getNextOccurrence(event, new Date(2026, 6, 1));
    expect(next).toEqual(new Date(2026, 6, 20, 9, 0));
  });

  it("returns null for a non-recurring event already in the past", () => {
    const event = sample({ startAt: "2026-06-01T09:00" });
    const next = getNextOccurrence(event, new Date(2026, 6, 1));
    expect(next).toBeNull();
  });

  it("advances a recurring event forward to the first occurrence at or after now", () => {
    const event = sample({ startAt: "2026-07-01T09:00", recurring: { frequency: "daily" } });
    const next = getNextOccurrence(event, new Date(2026, 6, 10, 12, 0));
    expect(next).toEqual(new Date(2026, 6, 11, 9, 0));
  });
});
