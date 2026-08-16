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

  it("matches a date-only timestamp against a same-day date+time timestamp (notification-capture vs. later slip scan)", () => {
    // A notification-confirmed transaction never has a time (see
    // buildNotificationCandidate.ts); a later gallery/OCR scan of the same
    // physical slip does. Same calendar day should still register as a
    // timestamp match, not silently fail a pure string comparison.
    const score = duplicateProbability({ timestamp: "2026-08-08" }, { timestamp: "2026-08-08 09:15" });
    expect(score.matched).toEqual(["timestamp"]);
    expect(score.probability).toBeCloseTo(0.4);
  });

  it("does not match a date-only timestamp against a date+time timestamp on a different day", () => {
    const score = duplicateProbability({ timestamp: "2026-08-08" }, { timestamp: "2026-08-09 09:15" });
    expect(score.matched).toEqual([]);
  });

  it("matches two full timestamps within a small tolerance (OCR/notification jitter)", () => {
    const score = duplicateProbability({ timestamp: "2026-08-08 09:15" }, { timestamp: "2026-08-08 09:17" });
    expect(score.matched).toEqual(["timestamp"]);
  });

  it("does not match two full timestamps well outside the tolerance window, even same day", () => {
    const score = duplicateProbability({ timestamp: "2026-08-08 09:15" }, { timestamp: "2026-08-08 18:00" });
    expect(score.matched).toEqual([]);
  });

  it("still matches an exact timestamp string, including an unparseable one", () => {
    const score = duplicateProbability({ timestamp: "not-a-real-date" }, { timestamp: "not-a-real-date" });
    expect(score.matched).toEqual(["timestamp"]);
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
