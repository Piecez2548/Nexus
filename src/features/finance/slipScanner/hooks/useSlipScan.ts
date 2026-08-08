import { useCallback, useState } from "react";

import { createDuplicateDetector } from "@/features/finance/slipScanner/engine/dedup/slipDuplicate";
import { webAssetId } from "@/features/finance/slipScanner/gallery/media/WebPickerProvider";
import { extractSlipCandidate, type ExtractSlipInput } from "@/features/finance/slipScanner/import/extractSlipCandidate";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { revokeThumbnails } from "@/features/finance/slipScanner/security/secureDeletion";

// The image→candidate extractor, injectable so tests can supply a fake instead
// of the real jsQR + Tesseract path.
export type SlipExtractor = (input: ExtractSlipInput) => Promise<SlipCandidate>;

export interface UseSlipScan {
  scanning: boolean;
  progress: { done: number; total: number } | null;
  candidates: SlipCandidate[];
  scan: (files: File[]) => Promise<SlipCandidate[]>;
  reset: () => void;
}

// Runs the extraction pipeline over a picked set of images (the picker flow, as
// opposed to full-gallery auto-scan). For each file: read bytes, make a
// thumbnail object-URL, extract a candidate (real jsQR + Tesseract), and flag
// slip-level duplicates within the batch. Kept small — the picker returns a
// bounded set, so it doesn't need the concurrent queue built for 50k libraries.
export function useSlipScan(extractor: SlipExtractor = extractSlipCandidate): UseSlipScan {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [candidates, setCandidates] = useState<SlipCandidate[]>([]);

  const reset = useCallback(() => {
    setCandidates((current) => {
      revokeThumbnails(current); // release image blobs (secure deletion, GS-017)
      return [];
    });
    setProgress(null);
  }, []);

  const scan = useCallback(async (files: File[]): Promise<SlipCandidate[]> => {
    setScanning(true);
    setProgress({ done: 0, total: files.length });

    const dedup = createDuplicateDetector();
    const results: SlipCandidate[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const thumbnailUrl = URL.createObjectURL(file);

        const candidate = await extractor({ assetId: webAssetId(file), bytes, thumbnailUrl });
        const isDuplicate = dedup.markSeen({
          payload: candidate.payload,
          ref1: candidate.reference,
          amount: candidate.amount,
          bank: candidate.bankId,
          merchant: candidate.merchant,
          timestamp: [candidate.date, candidate.time].filter(Boolean).join(" ") || undefined,
        });

        results.push({ ...candidate, isDuplicate });
        setProgress({ done: i + 1, total: files.length });
      }

      setCandidates(results);
      return results;
    } finally {
      setScanning(false);
    }
  }, [extractor]);

  return { scanning, progress, candidates, scan, reset };
}
