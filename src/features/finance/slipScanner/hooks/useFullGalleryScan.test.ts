import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";

import { useFullGalleryScan } from "./useFullGalleryScan";

function file(name: string, content: string): File {
  return new File([content], name, { type: "image/jpeg" });
}

const fakeExtractor: SlipExtractor = async ({ assetId }): Promise<SlipCandidate> => ({
  id: assetId,
  assetId,
  source: assetId.includes("qr") ? "qr" : "ocr",
  isDuplicate: false,
  confidence: 90,
  amount: 100,
});

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
});

describe("useFullGalleryScan", () => {
  it("accumulates real candidates and reaches 100% via the orchestrator", async () => {
    const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

    await act(async () => {
      await result.current.scanPickedFiles([file("qr1.jpg", "a"), file("ocr1.jpg", "b")], false);
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.candidates).toHaveLength(2);
    expect(result.current.snapshot?.percent).toBe(100);
    expect(result.current.snapshot?.scanned).toBe(2);
  });

  it("splits qrDetected/ocrProcessed counts by each candidate's source", async () => {
    const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

    await act(async () => {
      await result.current.scanPickedFiles(
        [file("qr1.jpg", "a"), file("qr2.jpg", "b"), file("ocr1.jpg", "c")],
        false,
      );
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.snapshot?.qrDetected).toBe(2);
    expect(result.current.snapshot?.ocrProcessed).toBe(1);
  });

  it("keeps `imported` at 0 during and after the scan (nothing is imported until Smart Import runs)", async () => {
    const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

    await act(async () => {
      await result.current.scanPickedFiles([file("qr1.jpg", "a")], false);
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.snapshot?.imported).toBe(0);
  });

  it("clears prior candidates and counts when a new scan starts", async () => {
    const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

    await act(async () => {
      await result.current.scanPickedFiles([file("qr1.jpg", "a"), file("qr2.jpg", "b")], false);
    });
    await waitFor(() => expect(result.current.candidates).toHaveLength(2));

    await act(async () => {
      await result.current.scanPickedFiles([file("ocr1.jpg", "c")], false);
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.candidates).toHaveLength(1);
    expect(result.current.snapshot?.qrDetected).toBe(0);
    expect(result.current.snapshot?.ocrProcessed).toBe(1);
  });

  it("reset() clears candidates without starting a new scan", async () => {
    const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

    await act(async () => {
      await result.current.scanPickedFiles([file("qr1.jpg", "a")], false);
    });
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));

    act(() => result.current.reset());
    expect(result.current.candidates).toEqual([]);
  });
});
