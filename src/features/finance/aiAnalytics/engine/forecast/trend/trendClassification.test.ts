import { describe, expect, it } from "vitest";
import { classifyDirection } from "./trendClassification";

describe("classifyDirection", () => {
  it("is insufficientData with fewer than 2 values", () => {
    expect(classifyDirection([])).toBe("insufficientData");
    expect(classifyDirection([100])).toBe("insufficientData");
  });

  it("is increasing when the trailing run rises for at least 2 consecutive periods", () => {
    expect(classifyDirection([100, 150, 200, 250])).toBe("increasing");
  });

  it("is decreasing when the trailing run falls for at least 2 consecutive periods", () => {
    expect(classifyDirection([300, 250, 200, 150])).toBe("decreasing");
  });

  it("is stable when the trailing run neither rises nor falls for 2 periods running", () => {
    expect(classifyDirection([200, 250, 200, 210])).toBe("stable");
  });

  it("only looks at the trailing run, not the whole series", () => {
    // Rose earlier, but the last two periods are flat/down — not a live increasing trend.
    expect(classifyDirection([100, 200, 210, 205])).toBe("stable");
  });

  it("is insufficientData for a fixed-length window with fewer than 2 active (non-zero) points, even though the array itself is long", () => {
    // monthlyValuesFor always returns a fixed-length window padded with
    // zeros for months with no activity — a plain length check would never
    // catch this case.
    expect(classifyDirection([0, 0, 0, 0, 0, 500])).toBe("insufficientData");
  });
});
