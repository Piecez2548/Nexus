import { describe, expect, it } from "vitest";

import { otsuThreshold } from "./otsu";

describe("otsuThreshold", () => {
  it("finds a threshold that separates dark text from a light background", () => {
    // Many dark pixels (~30) and many light pixels (~210).
    const gray = new Uint8Array([...Array(500).fill(30), ...Array(500).fill(210)]);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(210);
    // The threshold cleanly splits the two clusters (dark text vs light bg).
    expect(30 > t ? 255 : 0).toBe(0);
    expect(210 > t ? 255 : 0).toBe(255);
  });

  it("is safe on an empty buffer", () => {
    expect(otsuThreshold([])).toBe(127);
  });
});
