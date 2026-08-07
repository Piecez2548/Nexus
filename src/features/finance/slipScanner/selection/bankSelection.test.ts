import { describe, expect, it } from "vitest";

import {
  PER_IMAGE_SCAN_MS,
  QUICK_SELECT_BANK_IDS,
  availableBanks,
  estimateScan,
  filterBanks,
  toggleBankId,
} from "./bankSelection";

describe("availableBanks", () => {
  it("sources the banks from the registry, including PromptPay", () => {
    const ids = availableBanks().map((b) => b.id);
    expect(ids).toContain("scb");
    expect(ids).toContain("promptpay");
  });
});

describe("filterBanks", () => {
  const banks = availableBanks();

  it("returns everything for an empty query", () => {
    expect(filterBanks(banks, "  ")).toHaveLength(banks.length);
  });

  it("matches on short name, full name, or id (case-insensitive)", () => {
    expect(filterBanks(banks, "scb").map((b) => b.id)).toEqual(["scb"]);
    expect(filterBanks(banks, "kasikorn").map((b) => b.id)).toEqual(["kbank"]);
    expect(filterBanks(banks, "PROMPT").map((b) => b.id)).toEqual(["promptpay"]);
  });
});

describe("toggleBankId", () => {
  it("adds an absent id and removes a present one, immutably", () => {
    const base = ["a", "b"];
    expect(toggleBankId(base, "c")).toEqual(["a", "b", "c"]);
    expect(toggleBankId(base, "a")).toEqual(["b"]);
    expect(base).toEqual(["a", "b"]); // unchanged
  });
});

describe("estimateScan", () => {
  it("computes seconds from the per-image estimate", () => {
    expect(estimateScan(100)).toEqual({ imageCount: 100, totalSeconds: Math.round((100 * PER_IMAGE_SCAN_MS) / 1000) });
  });

  it("returns nulls when the count is unknown or invalid", () => {
    expect(estimateScan(null)).toEqual({ imageCount: null, totalSeconds: null });
    expect(estimateScan(-5)).toEqual({ imageCount: null, totalSeconds: null });
  });
});

describe("QUICK_SELECT_BANK_IDS", () => {
  it("only references real registry bank ids", () => {
    const ids = new Set(availableBanks().map((b) => b.id));
    for (const id of QUICK_SELECT_BANK_IDS) expect(ids.has(id)).toBe(true);
  });
});
