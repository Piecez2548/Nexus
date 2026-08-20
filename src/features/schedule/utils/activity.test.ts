import { describe, expect, it } from "vitest";
import { getCurrentAndNext, isActiveOnDate, getDayOffset } from "./activity";
import type { ScheduleItem } from "@/features/schedule/types";

function item(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    title: "Item",
    icon: "sunrise",
    color: "#000000",
    startTime: "06:00",
    repeat: { frequency: "daily" },
    enabled: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

// 2026-07-28 is a Tuesday (weekday 2).
function at(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 6, 28, h, m);
}

describe("isActiveOnDate", () => {
  it("a daily item is active on any weekday", () => {
    const daily = item({ repeat: { frequency: "daily" } });
    expect(isActiveOnDate(daily, at("00:00"))).toBe(true);
  });

  it("a weekly item is only active on its selected weekdays", () => {
    const mondayOnly = item({ repeat: { frequency: "weekly", weekdays: [1] } });
    expect(isActiveOnDate(mondayOnly, at("00:00"))).toBe(false); // Tuesday
  });
});

describe("getDayOffset", () => {
  it("returns 0 for the same calendar date, regardless of time-of-day", () => {
    expect(getDayOffset(at("08:00"), at("23:00"))).toBe(0);
  });

  it("returns 1 for the next calendar day", () => {
    const tomorrow = new Date(2026, 6, 29, 6, 0);
    expect(getDayOffset(at("23:00"), tomorrow)).toBe(1);
  });

  it("returns a larger offset across a month boundary", () => {
    const nextMonth = new Date(2026, 7, 2, 0, 0);
    expect(getDayOffset(at("00:00"), nextMonth)).toBe(5);
  });
});

describe("getCurrentAndNext", () => {
  it("finds the item whose window contains now (mid-window current)", () => {
    const workout = item({ id: 1, title: "Workout", startTime: "17:30", endTime: "19:00" });
    const result = getCurrentAndNext([workout], at("18:12"));
    expect(result.current?.title).toBe("Workout");
  });

  it("computes the elapsed fraction of the current item's window", () => {
    const workout = item({ id: 1, startTime: "17:00", endTime: "19:00" });
    const result = getCurrentAndNext([workout], at("18:00")); // halfway through
    expect(result.currentProgress).toBe(50);
  });

  it("currentProgress is null when nothing is currently active", () => {
    const workout = item({ id: 1, startTime: "17:00", endTime: "17:30" });
    const result = getCurrentAndNext([workout], at("20:00"));
    expect(result.currentProgress).toBeNull();
  });

  it("leaves a real gap when endTime is explicitly set and now falls after it", () => {
    const morning = item({ id: 1, title: "Morning", startTime: "06:00", endTime: "06:30" });
    const evening = item({ id: 2, title: "Evening", startTime: "20:00" });
    const result = getCurrentAndNext([morning, evening], at("10:00"));
    expect(result.current).toBeNull();
  });

  it("an item with no endTime implicitly runs until the next item starts", () => {
    const wakeUp = item({ id: 1, title: "Wake up", startTime: "06:00" });
    const shower = item({ id: 2, title: "Shower", startTime: "07:00" });
    const result = getCurrentAndNext([wakeUp, shower], at("06:45"));
    expect(result.current?.title).toBe("Wake up");
  });

  it("the last item with no endTime runs until midnight", () => {
    const sleep = item({ id: 1, title: "Sleep", startTime: "22:00" });
    const result = getCurrentAndNext([sleep], at("23:30"));
    expect(result.current?.title).toBe("Sleep");
  });

  it("finds the next item later today", () => {
    const dinner = item({ id: 1, title: "Dinner", startTime: "19:00" });
    const result = getCurrentAndNext([dinner], at("18:00"));
    expect(result.next?.title).toBe("Dinner");
  });

  it("nextDate is today when the next item is still later today", () => {
    const dinner = item({ id: 1, title: "Dinner", startTime: "19:00" });
    const now = at("18:00");
    const result = getCurrentAndNext([dinner], now);
    expect(getDayOffset(now, result.nextDate!)).toBe(0);
  });

  it("wraps around to tomorrow's earliest item when nothing is left today", () => {
    const wakeUp = item({ id: 1, title: "Wake up", startTime: "06:00", repeat: { frequency: "daily" } });
    const result = getCurrentAndNext([wakeUp], at("23:00"));
    expect(result.next?.title).toBe("Wake up");
  });

  it("nextDate is tomorrow when a lone daily item is currently in progress", () => {
    // Regression test: without nextDate, a lone recurring item showed up as
    // both "current" and "next" with the identical title/time and no way
    // to tell it apart from a bug.
    const workout = item({ id: 1, title: "Workout", startTime: "17:00", endTime: "19:00" });
    const now = at("18:00"); // mid-window: Workout is current
    const result = getCurrentAndNext([workout], now);
    expect(result.current?.title).toBe("Workout");
    expect(result.next?.title).toBe("Workout");
    expect(getDayOffset(now, result.nextDate!)).toBe(1);
  });

  it("skips a weekly item on a day it isn't active when scanning ahead", () => {
    // 2026-07-28 is Tuesday; a Thursday-only item should be found 2 days out.
    const gym = item({ id: 1, title: "Gym", startTime: "06:00", repeat: { frequency: "weekly", weekdays: [4] } });
    const now = at("23:00");
    const result = getCurrentAndNext([gym], now);
    expect(result.next?.title).toBe("Gym");
    expect(getDayOffset(now, result.nextDate!)).toBe(2);
  });

  it("nextDate is null when there is no next occurrence at all", () => {
    const workout = item({ id: 1, enabled: false, startTime: "17:00" });
    const result = getCurrentAndNext([workout], at("17:30"));
    expect(result.nextDate).toBeNull();
  });

  it("returns null for both when every item is disabled", () => {
    const workout = item({ id: 1, enabled: false, startTime: "17:00" });
    const result = getCurrentAndNext([workout], at("17:30"));
    expect(result.current).toBeNull();
    expect(result.next).toBeNull();
  });

  describe("overnight items (endTime earlier than startTime)", () => {
    // Regression: an item like "Sleep" 22:00-06:00 was never detected as
    // current at any time of day -- the unwrapped `nowMinutes >= start &&
    // nowMinutes < end` check is unsatisfiable once start > end numerically.

    it("is current during the evening half, before midnight", () => {
      const sleep = item({ id: 1, title: "Sleep", startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("23:00"));
      expect(result.current?.title).toBe("Sleep");
    });

    it("is current during the early-morning half, after midnight", () => {
      const sleep = item({ id: 1, title: "Sleep", startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("02:00"));
      expect(result.current?.title).toBe("Sleep");
    });

    it("is not current once the early-morning half has ended", () => {
      const sleep = item({ id: 1, title: "Sleep", startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("07:00"));
      expect(result.current).toBeNull();
    });

    it("is not current before the evening half has started", () => {
      const sleep = item({ id: 1, title: "Sleep", startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("21:00"));
      expect(result.current).toBeNull();
    });

    it("computes elapsed progress correctly across the midnight boundary (evening half)", () => {
      // 22:00-06:00 is an 8-hour (480min) span; 23:00 is 1 hour (60min) in.
      const sleep = item({ id: 1, startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("23:00"));
      expect(result.currentProgress).toBeCloseTo((60 / 480) * 100);
    });

    it("computes elapsed progress correctly across the midnight boundary (early-morning half)", () => {
      // 22:00-06:00 is an 8-hour (480min) span; 02:00 is 4 hours (240min) in
      // (2 hours to midnight + 2 hours past it).
      const sleep = item({ id: 1, startTime: "22:00", endTime: "06:00" });
      const result = getCurrentAndNext([sleep], at("02:00"));
      expect(result.currentProgress).toBeCloseTo((240 / 480) * 100);
    });

    it("checks yesterday's weekday, not today's, for the early-morning half of a weekly item", () => {
      // 2026-07-28 is Tuesday; a Monday-only overnight item's early-morning
      // half spills into Tuesday, and must still be found there.
      const mondayNight = item({
        id: 1,
        title: "Monday Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        repeat: { frequency: "weekly", weekdays: [1] },
      });
      const result = getCurrentAndNext([mondayNight], at("02:00"));
      expect(result.current?.title).toBe("Monday Night Shift");
    });

    it("does not misfire the early-morning half for a weekly item not active yesterday", () => {
      // Same shape, but scoped to Wednesday instead of Monday -- yesterday
      // (Monday) doesn't qualify, so nothing should be current.
      const wednesdayNight = item({
        id: 1,
        title: "Wednesday Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        repeat: { frequency: "weekly", weekdays: [3] },
      });
      const result = getCurrentAndNext([wednesdayNight], at("02:00"));
      expect(result.current).toBeNull();
    });

    it("a normal (non-overnight) item's endTime equal to its startTime is not treated as wrapping", () => {
      // Guards the `wraps` predicate's boundary: end === start is a
      // zero-length window, not an overnight one -- must not become "wraps
      // until midnight then to the same time," which would make it current
      // almost the entire day.
      const zeroLength = item({ id: 1, startTime: "10:00", endTime: "10:00" });
      const result = getCurrentAndNext([zeroLength], at("10:00"));
      expect(result.current).toBeNull();
    });
  });
});
