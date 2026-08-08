import { describe, expect, it } from "vitest";

import { arePerceptuallySimilar, computePHash, hammingDistanceHex } from "./perceptualHash";

// A 32×32 grayscale gradient (value increases left→right).
function gradient(transpose = false): number[] {
  const g: number[] = [];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      g.push(((transpose ? y : x) / 31) * 255);
    }
  }
  return g;
}

describe("hammingDistanceHex", () => {
  it("counts differing bits between equal-length hashes", () => {
    expect(hammingDistanceHex("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistanceHex("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistanceHex("0000000000000000", "8000000000000000")).toBe(1);
  });

  it("returns Infinity for mismatched lengths", () => {
    expect(hammingDistanceHex("00", "0000")).toBe(Infinity);
  });
});

describe("computePHash", () => {
  it("produces a stable 16-hex-char hash", () => {
    const g = gradient();
    const h = computePHash(g);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(computePHash(g)).toBe(h); // deterministic
  });

  it("throws on a wrong-sized input", () => {
    expect(() => computePHash([1, 2, 3])).toThrow();
  });

  it("gives an identical image distance 0 and captures orientation", () => {
    const horizontal = computePHash(gradient(false));
    const vertical = computePHash(gradient(true));
    expect(hammingDistanceHex(horizontal, horizontal)).toBe(0);
    // A gradient and its transpose are structurally different.
    expect(hammingDistanceHex(horizontal, vertical)).toBeGreaterThan(0);
  });
});

describe("arePerceptuallySimilar", () => {
  it("treats identical hashes as similar and honours the threshold", () => {
    expect(arePerceptuallySimilar("abcd0000abcd0000", "abcd0000abcd0000")).toBe(true);
    expect(arePerceptuallySimilar("0000000000000000", "00000000000000ff", 4)).toBe(false); // 8 bits > 4
    expect(arePerceptuallySimilar("0000000000000000", "00000000000000ff", 10)).toBe(true); // 8 bits <= 10
  });
});
