import { useCallback, useMemo, useRef, useState } from "react";

import { useGalleryScan } from "@/features/finance/slipScanner/hooks/useGalleryScan";
import { extractSlipCandidate } from "@/features/finance/slipScanner/import/extractSlipCandidate";
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
// processing order that the concurrent queue does not guarantee.
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

  const onCandidate = useCallback((_asset: GalleryAssetRef, candidate: SlipCandidate) => {
    setCandidates((prev) => [...prev, candidate]);
    setCounts((prev) => ({
      qrDetected: prev.qrDetected + (candidate.source === "qr" ? 1 : 0),
      ocrProcessed: prev.ocrProcessed + (candidate.source === "ocr" ? 1 : 0),
    }));
  }, []);

  const processor = useMemo(() => createSlipExtractionProcessor(onCandidate, extractor), [onCandidate, extractor]);

  function beginNewRun(): void {
    setCandidates([]);
    setCounts({ qrDetected: 0, ocrProcessed: 0 });
    startedAtRef.current = Date.now();
  }

  const scanPickedFiles = useCallback(
    async (files: File[], incremental = false) => {
      beginNewRun();
      await gallery.scanPickedFiles(files, incremental, processor);
    },
    [gallery, processor],
  );

  const scanNativeGallery = useCallback(
    async (incremental = true, dateRange?: ScanOptions["dateRange"]) => {
      beginNewRun();
      await gallery.scanNativeGallery(incremental, processor, dateRange);
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

  function reset(): void {
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
