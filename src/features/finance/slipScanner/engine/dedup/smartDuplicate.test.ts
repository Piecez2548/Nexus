import { describe, expect, it } from "vitest";

import { duplicateProbability, findBestDuplicate, isLikelyDuplicate } from "./smartDuplicate";

describe("duplicateProbability", () => {
  it("is 0 when nothing is comparable", () => {
    expect(duplicateProbability({ amount: 100 }, { merchant: "x" })).toEqual({ probability: 0, matched: [] });
  });

  it("scores an identical payload very high", () => {
    const score = duplicateProbability({ payload: "0002...X" }, { payload: "0002...X" });
    expect(score.matched).toEqual(["payload"]);
    expect(score.probability).toBeCloseTo(0.85);
  });

  it("treats the same reference (ignoring formatting) as a strong match", () => {
    const score = duplicateProbability({ reference: "TX-000 111" }, { reference: "tx000111" });
    expect(score.matched).toContain("reference");
    expect(score.probability).toBeCloseTo(0.8);
  });

  it("combines weak signals via noisy-OR into a likely duplicate", () => {
    const a = { amount: 120, merchant: "Coffee Shop", timestamp: "2024-05-12 14:30" };
    const b = { amount: 120, merchant: "coffee shop", timestamp: "2024-05-12 14:30" };
    const score = duplicateProbability(a, b);
    expect(score.matched.sort()).toEqual(["amount", "merchant", "timestamp"]);
    // 1 - (1-0.4)(1-0.3)(1-0.3) = 1 - 0.294 = 0.706
    expect(score.probability).toBeCloseTo(0.706);
    expect(isLikelyDuplicate(score)).toBe(true);
  });

  it("matches near-identical images by perceptual hash", () => {
    const score = duplicateProbability({ pHash: "0000000000000000" }, { pHash: "0000000000000001" });
    expect(score.matched).toContain("pHash");
    expect(score.probability).toBeCloseTo(0.7);
  });
});

describe("findBestDuplicate", () => {
  it("returns the highest-probability match", () => {
    const target = { reference: "REF1", amount: 50 };
    const best = findBestDuplicate(target, [{ amount: 50 }, { reference: "REF1" }, { merchant: "z" }]);
    expect(best?.index).toBe(1); // reference match beats amount-only
    expect(best?.score.probability).toBeCloseTo(0.8);
  });

  it("returns null for an empty list", () => {
    expect(findBestDuplicate({ amount: 1 }, [])).toBeNull();
  });
});
