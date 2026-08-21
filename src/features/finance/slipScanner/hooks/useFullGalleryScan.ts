import { useCallback, useMemo, useRef, useState } from "react";

import { useGalleryScan } from "@/features/finance/slipScanner/hooks/useGalleryScan";
import { flagBatchDuplicates } from "@/features/finance/slipScanner/engine/dedup/flagBatchDuplicates";
import { extractSlipCandidate } from "@/features/finance/slipScanner/import/extractSlipCandidate";
import { scanCandidateRepository } from "@/features/finance/slipScanner/repositories/scanCandidateRepository";
import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
import type { GalleryAssetRef, ScanOptions, ScanStatus } from "@/features/finance/slipScanner/models/scanTypes";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { computeScanProgress, type ScanProgressSnapshot } from "@/features/finance/slipScanner/progress/scanProgress";
import { createSlipExtractionProcessor, type SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";

export interface UseFullGalleryScan {
  status: ScanStatus;
  snapshot: ScanProgressSnapshot | null;
  candidates: SlipCandidate[];
  error: string | null;
  scanPickedFiles: (files: File[], incremental?: boolean) => Promise<void>;
  scanNativeGallery: (incremental?: boolean, dateRange?: ScanOptions["dateRange"]) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  reset: () => void;
}

// Drives the orchestrator-backed scan (GS-006/007/008: concurrent queue, byte
// budget, cache, pause/resume/cancel) with real extraction, and turns its raw
// asset-level ScanProgress into the richer ScanProgressSnapshot the dashboard
// (GS-034) renders -- qrDetected/ocrProcessed are accumulated here from each
// candidate as it arrives, since the orchestrator itself only counts done/
// skipped/failed at the asset level, not by extraction outcome. `imported`
// stays 0 for the lifetime of a scan: nothing is imported until the resulting
// candidates go through Import Preview -> Smart Import afterwards.
//
// This is today's entry point for a *large or open-ended* gallery scan (the
// concurrent queue and cache exist for that case); the existing bounded
// picker flow (useSlipScan) intentionally stays on its own simple sequential
// loop, since its within-batch duplicate detection depends on strict
// processing order that the concurrent queue does not guarantee. This path
// recovers the same advisory `isDuplicate` badge a different way: once a
// scan settles (below), flagBatchDuplicates() re-derives it in one
// deterministic pass over the *complete* accumulated batch, sorted by the
// one stable key every candidate carries (assetId) -- so the result never
// depends on the concurrent queue's actual arrival order.
//
// Default extractor opts into skipOcrWhenNoQr: real-device measurement
// showed OCR (even pooled) dominates per-image cost, and the overwhelming
// majority of a real gallery's photos aren't slips at all -- see
// extractSlipCandidate's own doc comment on the flag for the accuracy
// tradeoff this accepts. The manual picker flow (useSlipScan) does NOT opt
// into this, since every photo a user explicitly picks there is a
// user-confirmed candidate slip.
const defaultFullGalleryExtractor: SlipExtractor = (input) => extractSlipCandidate({ ...input, skipOcrWhenNoQr: true });

export function useFullGalleryScan(extractor: SlipExtractor = defaultFullGalleryExtractor): UseFullGalleryScan {
  const gallery = useGalleryScan();
  const [candidates, setCandidates] = useState<SlipCandidate[]>([]);
  const [counts, setCounts] = useState({ qrDetected: 0, ocrProcessed: 0 });
  const startedAtRef = useRef(Date.now());
  // The scan run these `candidates` belong to, so reset() knows what to clear
  // from slipScanCandidates (BUG-05 fix). Set both up front, when a resumable
  // run is found (see beginNewRun below), and from the processor callback
  // (which always knows the real runId, including for a brand-new run whose
  // id isn't known until scanSessionService creates it).
  const runIdRef = useRef<number | null>(null);

  const onCandidate = useCallback(async (_asset: GalleryAssetRef, candidate: SlipCandidate, runId: number) => {
    runIdRef.current = runId;
    // Awaited (not fire-and-forget): the processor awaits onCandidate before
    // scanSessionService marks the asset "scanned" in slipScanCache, so this
    // write must land first -- otherwise a kill in the gap between the two
    // would still lose the candidate while its asset looks already handled.
    await scanCandidateRepository.add(runId, candidate);
    setCandidates((prev) => [...prev, candidate]);
    setCounts((prev) => ({
      qrDetected: prev.qrDetected + (candidate.source === "qr" ? 1 : 0),
      ocrProcessed: prev.ocrProcessed + (candidate.source === "ocr" ? 1 : 0),
    }));
  }, []);

  const processor = useMemo(() => createSlipExtractionProcessor(onCandidate, extractor), [onCandidate, extractor]);

  // Seeds from any candidates left over from an interrupted run (app kill,
  // crash, reload) instead of always starting empty -- the counterpart to
  // scanSessionService's own resume-by-cursor logic, which would otherwise
  // silently skip re-extracting those same assets (already marked "scanned"
  // in slipScanCache) and lose them for good. Only a normal incremental,
  // non-date-range scan is ever resumed (mirrors scanSessionService's own
  // `resumeAllowed`), so a bounded picker/date-range scan always starts clean.
  async function beginNewRun(resumeEligible: boolean): Promise<void> {
    const resumable = resumeEligible ? await scanRunRepository.getResumable() : undefined;
    if (resumable?.id !== undefined) {
      runIdRef.current = resumable.id;
      const leftover = await scanCandidateRepository.listByRun(resumable.id);
      setCandidates(leftover);
      const qrDetected = leftover.filter((c) => c.source === "qr").length;
      const ocrProcessed = leftover.filter((c) => c.source === "ocr").length;
      setCounts({ qrDetected, ocrProcessed });
    } else {
      runIdRef.current = null;
      setCandidates([]);
      setCounts({ qrDetected: 0, ocrProcessed: 0 });
    }
    startedAtRef.current = Date.now();
  }

  const scanPickedFiles = useCallback(
    async (files: File[], incremental = false) => {
      await beginNewRun(incremental); // picker flow never sets a dateRange
      await gallery.scanPickedFiles(files, incremental, processor);
      setCandidates(flagBatchDuplicates);
    },
    [gallery, processor],
  );

  const scanNativeGallery = useCallback(
    async (incremental = true, dateRange?: ScanOptions["dateRange"]) => {
      await beginNewRun(incremental && !dateRange);
      await gallery.scanNativeGallery(incremental, processor, dateRange);
      setCandidates(flagBatchDuplicates);
    },
    [gallery, processor],
  );

  const snapshot: ScanProgressSnapshot | null = gallery.progress
    ? computeScanProgress(
        {
          total: gallery.progress.total,
          scanned: gallery.progress.done,
          qrDetected: counts.qrDetected,
          ocrProcessed: counts.ocrProcessed,
          imported: 0,
        },
        startedAtRef.current,
      )
    : null;

  // Called after a successful import and when the user discards the preview
  // outright -- both cases already treat every current candidate as resolved
  // (imported or explicitly dismissed), so their persisted copies are cleared
  // too, not just the in-memory list.
  function reset(): void {
    if (runIdRef.current !== null) void scanCandidateRepository.clearRun(runIdRef.current);
    runIdRef.current = null;
    setCandidates([]);
    setCounts({ qrDetected: 0, ocrProcessed: 0 });
  }

  return {
    status: gallery.status,
    snapshot,
    candidates,
    error: gallery.error,
    scanPickedFiles,
    scanNativeGallery,
    pause: gallery.pause,
    resume: gallery.resume,
    cancel: gallery.cancel,
    reset,
  };
}
