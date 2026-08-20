import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import { scanCandidateRepository } from "@/features/finance/slipScanner/repositories/scanCandidateRepository";
import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
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
  await db.slipScanCandidates.clear();
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

  // Regression (BUG-05): a candidate extracted before a scan was interrupted
  // (app kill, crash, reload) used to live only in this hook's React state,
  // so it was lost the moment the component remounted -- even though the
  // asset it came from was already marked "scanned" in slipScanCache, so a
  // resumed scan would never re-extract it. These tests simulate the
  // interruption directly: seed a "running" scan run (as scanSessionService
  // itself would leave behind mid-scan) plus a candidate already persisted
  // for it, then mount a *fresh* hook instance -- exactly what happens when
  // the app relaunches into the same in-progress run.
  describe("recovery after an interrupted scan (BUG-05)", () => {
    it("seeds candidates from a leftover interrupted run instead of starting empty", async () => {
      const leftover: SlipCandidate = {
        id: "qr-leftover",
        assetId: "qr-leftover",
        source: "qr",
        isDuplicate: false,
        confidence: 90,
        amount: 250,
      };
      const runId = await scanRunRepository.create({
        status: "running",
        source: "web-picker",
        startedAt: new Date().toISOString(),
        total: 2,
        done: 1,
        skipped: 0,
        failed: 0,
      });
      await scanCandidateRepository.add(runId, leftover);

      const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

      await act(async () => {
        await result.current.scanPickedFiles([file("ocr1.jpg", "c")], true);
      });

      await waitFor(() => expect(result.current.status).toBe("completed"));
      // The leftover candidate survives, and the newly scanned one joins it --
      // nothing extracted before the interruption was lost.
      expect(result.current.candidates).toHaveLength(2);
      expect(result.current.candidates.some((c) => c.assetId === "qr-leftover")).toBe(true);
      expect(result.current.candidates.some((c) => c.source === "ocr")).toBe(true);
    });

    it("does not resurrect leftover candidates for a non-incremental (bounded) scan", async () => {
      const leftover: SlipCandidate = {
        id: "qr-leftover",
        assetId: "qr-leftover",
        source: "qr",
        isDuplicate: false,
        confidence: 90,
        amount: 250,
      };
      const runId = await scanRunRepository.create({
        status: "running",
        source: "web-picker",
        startedAt: new Date().toISOString(),
        total: 2,
        done: 1,
        skipped: 0,
        failed: 0,
      });
      await scanCandidateRepository.add(runId, leftover);

      const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

      await act(async () => {
        await result.current.scanPickedFiles([file("ocr1.jpg", "c")], false);
      });

      await waitFor(() => expect(result.current.status).toBe("completed"));
      expect(result.current.candidates).toHaveLength(1);
      expect(result.current.candidates.some((c) => c.assetId === "qr-leftover")).toBe(false);
    });

    it("reset() also clears the persisted candidates for the run, not just in-memory state", async () => {
      const { result } = renderHook(() => useFullGalleryScan(fakeExtractor));

      await act(async () => {
        await result.current.scanPickedFiles([file("qr1.jpg", "a")], true);
      });
      await waitFor(() => expect(result.current.candidates).toHaveLength(1));
      expect(await db.slipScanCandidates.count()).toBe(1);

      act(() => result.current.reset());
      await waitFor(async () => expect(await db.slipScanCandidates.count()).toBe(0));
    });
  });
});
