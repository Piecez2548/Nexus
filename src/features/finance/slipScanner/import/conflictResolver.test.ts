import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";

import {
  defaultResolution,
  mergeCandidate,
  partitionDecisions,
  resolveBatch,
  type ImportConflict,
} from "./conflictResolver";

const candidate = (id: string, over: Partial<SlipCandidate> = {}): SlipCandidate => ({
  id,
  assetId: id,
  source: "qr",
  isDuplicate: true,
  confidence: 80,
  ...over,
});

const conflict = (id: string, probability: number): ImportConflict => ({
  candidate: candidate(id),
  existingId: 1,
  duplicateProbability: probability,
});

describe("defaultResolution", () => {
  it("skips near-certain duplicates and keeps-both otherwise", () => {
    expect(defaultResolution(0.9)).toBe("skip");
    expect(defaultResolution(0.7)).toBe("keep-both");
  });
});

describe("resolveBatch", () => {
  it("applies a single batch resolution to every conflict", () => {
    const decisions = resolveBatch([conflict("1", 0.9), conflict("2", 0.7)], { applyToAll: "replace" });
    expect(decisions.every((d) => d.resolution === "replace")).toBe(true);
  });

  it("honours per-candidate overrides, else the default policy", () => {
    const decisions = resolveBatch([conflict("1", 0.9), conflict("2", 0.7)], {
      overrides: new Map([["2", "merge"]]),
    });
    expect(decisions[0]!.resolution).toBe("skip"); // default for 0.9
    expect(decisions[1]!.resolution).toBe("merge"); // override
  });
});

describe("partitionDecisions", () => {
  it("groups decisions by action", () => {
    const groups = partitionDecisions(resolveBatch([conflict("1", 0.9), conflict("2", 0.7)], {}));
    expect(groups.skip.map((d) => d.candidate.id)).toEqual(["1"]);
    expect(groups["keep-both"].map((d) => d.candidate.id)).toEqual(["2"]);
  });
});

describe("mergeCandidate", () => {
  const existing: Transaction = { title: "Coffee", amount: 120, type: "expense", account: "Cash", date: "2024-05-12" };

  it("fills gaps without overwriting existing user values", () => {
    const merged = mergeCandidate(existing, candidate("x", { time: "14:30", bankName: "SCB", reference: "REF9" }));
    expect(merged.amount).toBe(120); // unchanged
    expect(merged.time).toBe("14:30"); // filled
    expect(merged.note).toBe("SCB · REF9"); // filled
  });

  it("keeps an existing note rather than replacing it", () => {
    const merged = mergeCandidate({ ...existing, note: "my note" }, candidate("x", { bankName: "SCB", reference: "REF9" }));
    expect(merged.note).toBe("my note");
  });
});
