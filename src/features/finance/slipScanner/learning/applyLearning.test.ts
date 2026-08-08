import { describe, expect, it } from "vitest";

import { applyBankNaming, applyMerchantMapping, applyOcrCorrections } from "./applyLearning";

describe("applyMerchantMapping", () => {
  it("returns the learned correction (normalised key) or the original", () => {
    const map = { "star bucks": "Starbucks" };
    expect(applyMerchantMapping("  Star  Bucks ", map)).toBe("Starbucks");
    expect(applyMerchantMapping("Unknown", map)).toBe("Unknown");
  });
});

describe("applyOcrCorrections", () => {
  it("applies wrong→right fixes, longest first", () => {
    const corrections = { "0": "O", "l23": "123" };
    expect(applyOcrCorrections("ref l23", corrections)).toBe("ref 123");
  });

  it("returns text unchanged when there are no corrections", () => {
    expect(applyOcrCorrections("abc", {})).toBe("abc");
  });
});

describe("applyBankNaming", () => {
  it("resolves a bank id to the preferred name or a fallback", () => {
    const map = { scb: "SCB Easy" };
    expect(applyBankNaming("scb", map)).toBe("SCB Easy");
    expect(applyBankNaming("kbank", map, "KBank")).toBe("KBank");
  });
});
