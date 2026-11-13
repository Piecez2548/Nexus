import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { latestCandidatePerAsset, mergeReviewQueue } from "./reviewQueue";

const candidate = (id: string, assetId = id, amount?: number): SlipCandidate => ({
  id,
  assetId,
  source: "ocr",
  amount,
  isDuplicate: false,
  confidence: 50,
});

describe("mergeReviewQueue", () => {
  it("keeps the pending queue when a scan finds nothing new", () => {
    const pending = [candidate("a"), candidate("b")];
    expect(mergeReviewQueue(pending, []).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("adds new candidates after the pending ones", () => {
    expect(mergeReviewQueue([candidate("a")], [candidate("b")]).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("replaces an older candidate for the same image with the re-scanned one", () => {
    const merged = mergeReviewQueue([candidate("old", "img-1"), candidate("other")], [candidate("new", "img-1", 1300)]);
    expect(merged.map((c) => c.id)).toEqual(["other", "new"]);
    expect(merged[1]!.amount).toBe(1300);
  });

  it("does not list the same candidate twice", () => {
    const a = candidate("a");
    expect(mergeReviewQueue([a], [a])).toEqual([a]);
  });
});

describe("latestCandidatePerAsset", () => {
  it("keeps only the newest run's candidate for each image", () => {
    const rows = [
      { runId: 67, candidate: candidate("r67", "img-1") },
      { runId: 72, candidate: candidate("r72", "img-1", 1300) },
      { runId: 67, candidate: candidate("r67b", "img-2") },
    ];
    expect(latestCandidatePerAsset(rows).map((c) => c.id).sort()).toEqual(["r67b", "r72"]);
  });
});
