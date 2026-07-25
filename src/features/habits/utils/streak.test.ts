import { describe, expect, it } from "vitest";
import { computeStreak, getRecentDates, isCompletedToday } from "./streak";

describe("computeStreak", () => {
  it("returns 0 for an empty completedDates array", () => {
    expect(computeStreak([], "daily")).toBe(0);
  });

  it("counts a consecutive daily streak ending today", () => {
    const today = new Date(2026, 6, 25); // Saturday
    const dates = ["2026-07-25", "2026-07-24", "2026-07-23"];
    expect(computeStreak(dates, "daily", today)).toBe(3);
  });

  it("breaks the daily streak on a gap", () => {
    const today = new Date(2026, 6, 25);
    const dates = ["2026-07-25", "2026-07-24", "2026-07-22"]; // missing 07-23
    expect(computeStreak(dates, "daily", today)).toBe(2);
  });

  it("applies a grace period when today isn't checked in yet but yesterday was", () => {
    const today = new Date(2026, 6, 25);
    const dates = ["2026-07-24", "2026-07-23"]; // today not yet checked in
    expect(computeStreak(dates, "daily", today)).toBe(2);
  });

  it("returns 0 when neither today nor yesterday was checked in", () => {
    const today = new Date(2026, 6, 25);
    const dates = ["2026-07-20"];
    expect(computeStreak(dates, "daily", today)).toBe(0);
  });

  it("does not let duplicate same-day entries inflate the streak", () => {
    const today = new Date(2026, 6, 25);
    const dates = ["2026-07-25", "2026-07-25", "2026-07-24"];
    expect(computeStreak(dates, "daily", today)).toBe(2);
  });

  it("counts a consecutive weekly streak across Monday-anchored weeks", () => {
    const today = new Date(2026, 6, 20); // Monday
    const dates = ["2026-07-20", "2026-07-13", "2026-07-06"];
    expect(computeStreak(dates, "weekly", today)).toBe(3);
  });

  it("resets the weekly streak on a skipped week", () => {
    const today = new Date(2026, 6, 20); // Monday
    const dates = ["2026-07-20", "2026-06-29"]; // gap of two weeks
    expect(computeStreak(dates, "weekly", today)).toBe(1);
  });
});

describe("getRecentDates", () => {
  it("returns n oldest-first calendar dates ending today", () => {
    const today = new Date(2026, 6, 25);
    expect(getRecentDates(3, today)).toEqual(["2026-07-23", "2026-07-24", "2026-07-25"]);
  });
});

describe("isCompletedToday", () => {
  it("returns true when today's date is in completedDates", () => {
    const today = new Date(2026, 6, 25);
    expect(isCompletedToday(["2026-07-25"], today)).toBe(true);
  });

  it("returns false when today's date is not in completedDates", () => {
    const today = new Date(2026, 6, 25);
    expect(isCompletedToday(["2026-07-24"], today)).toBe(false);
  });
});
