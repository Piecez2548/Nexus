import { describe, expect, it } from "vitest";

import { binarize, otsuThreshold } from "./otsu";

describe("otsuThreshold", () => {
  it("finds a threshold that separates dark text from a light background", () => {
    // Many dark pixels (~30) and many light pixels (~210).
    const gray = new Uint8Array([...Array(500).fill(30), ...Array(500).fill(210)]);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(210);

    binarize(gray, t);
    expect(gray[0]).toBe(0); // dark text → black
    expect(gray[999]).toBe(255); // light background → white
  });

  it("is safe on an empty buffer", () => {
    expect(otsuThreshold([])).toBe(127);
  });
});

describe("binarize", () => {
  it("splits pixels to 0/255 around the threshold", () => {
    const gray = new Uint8Array([10, 120, 130, 250]);
    binarize(gray, 125);
    expect([...gray]).toEqual([0, 0, 255, 255]);
  });
});
