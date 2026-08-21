import { describe, expect, it } from "vitest";

import { flagBatchDuplicates } from "./flagBatchDuplicates";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

function candidate(overrides: Partial<SlipCandidate> & { id: string; assetId: string }): SlipCandidate {
  return {
    thumbnailUrl: undefined,
    source: "qr",
    isDuplicate: false,
    confidence: 80,
    ...overrides,
  };
}

describe("flagBatchDuplicates", () => {
  it("flags the second of two candidates sharing a reference, regardless of arrival order", () => {
    const a = candidate({ id: "a", assetId: "asset-b", bankId: "scb", reference: "TXN123" });
    const b = candidate({ id: "b", assetId: "asset-a", bankId: "scb", reference: "TXN123" });

    // Arrival order is [a, b] (assetId "b" arrived first), but the stable
    // sort key is assetId -- "asset-a" (candidate b) sorts before
    // "asset-b" (candidate a), so b is the one kept, a is flagged.
    const result = flagBatchDuplicates([a, b]);
    const byId = new Map(result.map((c) => [c.id, c]));

    expect(byId.get("b")!.isDuplicate).toBe(false); // asset-a, sorts first
    expect(byId.get("a")!.isDuplicate).toBe(true); // asset-b, sorts second
  });

  it("produces the same flags regardless of the input array's order (determinism)", () => {
    const a = candidate({ id: "a", assetId: "asset-1", bankId: "scb", reference: "TXN1" });
    const b = candidate({ id: "b", assetId: "asset-2", bankId: "scb", reference: "TXN1" });
    const c = candidate({ id: "c", assetId: "asset-3", amount: 500, merchant: "Shop" });

    const forward = flagBatchDuplicates([a, b, c]);
    const reversed = flagBatchDuplicates([c, b, a]);

    const flagsOf = (list: SlipCandidate[]) =>
      new Map(list.map((x) => [x.id, x.isDuplicate]));

    expect(flagsOf(forward)).toEqual(flagsOf(reversed));
  });

  it("does not flag two candidates with no shared dedup signal", () => {
    const a = candidate({ id: "a", assetId: "asset-1", amount: 100 });
    const b = candidate({ id: "b", assetId: "asset-2", amount: 200 });

    const result = flagBatchDuplicates([a, b]);
    expect(result.every((c) => c.isDuplicate === false)).toBe(true);
  });

  it("preserves the original array order and every other field, only replacing isDuplicate", () => {
    const a = candidate({ id: "a", assetId: "asset-2", amount: 100, merchant: "Shop A" });
    const b = candidate({ id: "b", assetId: "asset-1", amount: 200, merchant: "Shop B" });

    const result = flagBatchDuplicates([a, b]);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]); // original order preserved
    expect(result[0]!.merchant).toBe("Shop A");
    expect(result[1]!.merchant).toBe("Shop B");
  });

  it("returns an empty array for an empty batch", () => {
    expect(flagBatchDuplicates([])).toEqual([]);
  });
});
