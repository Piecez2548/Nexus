import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { filterCandidates, searchMatches } from "./importPreview";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 50,
  ...over,
});

const list: SlipCandidate[] = [
  candidate({ id: "1", bankId: "scb", bankName: "SCB", merchant: "Coffee Shop", amount: 120, reference: "TX111" }),
  candidate({ id: "2", bankId: "kbank", bankName: "KBank", merchant: "Bookstore", amount: 550, isDuplicate: true }),
  candidate({ id: "3", bankId: "scb", bankName: "SCB", merchant: "Grocery", amount: 89 }),
];

describe("searchMatches", () => {
  it("matches merchant, reference, bank and amount, case-insensitively", () => {
    expect(searchMatches(list[0]!, "coffee")).toBe(true);
    expect(searchMatches(list[0]!, "TX111")).toBe(true);
    expect(searchMatches(list[0]!, "scb")).toBe(true);
    expect(searchMatches(list[0]!, "120")).toBe(true);
    expect(searchMatches(list[0]!, "bookstore")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(searchMatches(list[1]!, "  ")).toBe(true);
  });
});

describe("filterCandidates", () => {
  it("filters by duplicate status", () => {
    expect(filterCandidates(list, { search: "", duplicate: "unique" }).map((c) => c.id)).toEqual(["1", "3"]);
    expect(filterCandidates(list, { search: "", duplicate: "duplicates" }).map((c) => c.id)).toEqual(["2"]);
    expect(filterCandidates(list, { search: "", duplicate: "all" })).toHaveLength(3);
  });

  it("filters by bank", () => {
    expect(filterCandidates(list, { search: "", duplicate: "all", bankId: "scb" }).map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("combines search with the duplicate filter", () => {
    expect(filterCandidates(list, { search: "grocery", duplicate: "unique" }).map((c) => c.id)).toEqual(["3"]);
  });
});
