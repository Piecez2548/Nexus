import { describe, expect, it } from "vitest";
import { toLocalDateString, parseLocalDate } from "./localDate";

describe("toLocalDateString", () => {
  it("formats a Date as YYYY-MM-DD, zero-padded", () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses the Date's local fields, not UTC", () => {
    // 23:00 local time on Jan 31 — a UTC-based formatter could roll this to Feb 1.
    expect(toLocalDateString(new Date(2026, 0, 31, 23, 0))).toBe("2026-01-31");
  });
});

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD as a local midnight Date, round-tripping with toLocalDateString", () => {
    const date = parseLocalDate("2026-07-15");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(15);
    expect(toLocalDateString(date)).toBe("2026-07-15");
  });
});
