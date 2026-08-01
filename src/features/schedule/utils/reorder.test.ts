import { describe, expect, it } from "vitest";
import { deriveTimeBetween } from "./reorder";

describe("deriveTimeBetween", () => {
  it("computes the midpoint between two neighbors", () => {
    expect(deriveTimeBetween("06:00", "07:00")).toBe("06:30");
  });

  it("places 30 minutes before the following item when dragged to the very start", () => {
    expect(deriveTimeBetween(null, "07:00")).toBe("06:30");
  });

  it("places 30 minutes after the preceding item when dragged to the very end", () => {
    expect(deriveTimeBetween("22:00", null)).toBe("22:30");
  });

  it("falls back to a sane default when there are no neighbors at all", () => {
    expect(deriveTimeBetween(null, null)).toBe("12:00");
  });

  it("clamps to a 1-minute minimum gap when neighbors are very close together", () => {
    expect(deriveTimeBetween("06:00", "06:01")).toBe("06:01");
  });

  it("never goes below 00:00", () => {
    expect(deriveTimeBetween(null, "00:10")).toBe("00:00");
  });

  it("never reaches or exceeds 24:00", () => {
    expect(deriveTimeBetween("23:50", null)).toBe("23:59");
  });
});
