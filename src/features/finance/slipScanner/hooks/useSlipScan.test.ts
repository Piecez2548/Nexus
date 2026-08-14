import { act, renderHook } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { useSlipScan, type SlipExtractor } from "./useSlipScan";

// jsdom has no object-URL implementation; stub it for the thumbnail step.
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeAll(() => {
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
});
afterAll(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

function file(name: string, content: string): File {
  return new File([content], name, { type: "image/jpeg" });
}

// Fake extractor: turns each file's asset id into a candidate; same "content"
// (via a shared reference) collapses as a duplicate.
const fakeExtractor: SlipExtractor = async ({ assetId, thumbnailUrl }): Promise<SlipCandidate> => ({
  id: assetId,
  assetId,
  thumbnailUrl,
  source: "qr",
  isDuplicate: false,
  confidence: 90,
  amount: 100,
  reference: assetId.includes("dup") ? "SAMEREF" : `REF-${assetId}`,
  bankId: "scb",
});

describe("useSlipScan", () => {
  it("scans files into candidates and reports progress", async () => {
    const { result } = renderHook(() => useSlipScan(fakeExtractor));

    await act(async () => {
      await result.current.scan([file("a.jpg", "a"), file("b.jpg", "b")]);
    });

    expect(result.current.candidates).toHaveLength(2);
    expect(result.current.progress).toEqual({ done: 2, total: 2 });
    expect(result.current.scanning).toBe(false);
  });

  it("flags a re-scanned duplicate within the batch", async () => {
    const { result } = renderHook(() => useSlipScan(fakeExtractor));

    await act(async () => {
      await result.current.scan([file("dup1.jpg", "x"), file("dup2.jpg", "x")]);
    });

    // Both share reference SAMEREF → the second is a duplicate.
    expect(result.current.candidates[0]!.isDuplicate).toBe(false);
    expect(result.current.candidates[1]!.isDuplicate).toBe(true);
  });

  it("flags a near-duplicate within the batch via the graded Smart Duplicate signal, even with no matching reference", async () => {
    // Same amount/merchant/date/time (e.g. a re-saved copy with a misread
    // reference) — no exact-match signal at all, so only the graded check
    // (amount + merchant + timestamp combined) can catch this.
    const nearDupExtractor: SlipExtractor = async ({ assetId, thumbnailUrl }): Promise<SlipCandidate> => ({
      id: assetId,
      assetId,
      thumbnailUrl,
      source: "ocr",
      isDuplicate: false,
      confidence: 70,
      amount: 250,
      merchant: "Coffee Shop",
      date: "2026-08-08",
      time: "09:15",
      reference: `REF-${assetId}`, // distinct — the exact-match key must NOT catch this
    });

    const { result } = renderHook(() => useSlipScan(nearDupExtractor));

    await act(async () => {
      await result.current.scan([file("near1.jpg", "a"), file("near2.jpg", "b")]);
    });

    expect(result.current.candidates[0]!.isDuplicate).toBe(false);
    expect(result.current.candidates[1]!.isDuplicate).toBe(true);
  });

  it("reset clears candidates", async () => {
    const { result } = renderHook(() => useSlipScan(fakeExtractor));
    await act(async () => {
      await result.current.scan([file("a.jpg", "a")]);
    });
    act(() => result.current.reset());
    expect(result.current.candidates).toEqual([]);
  });
});
