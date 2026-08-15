import { useEffect, useRef, type ChangeEvent } from "react";

import ScanControls from "@/features/finance/slipScanner/components/ScanControls";
import ScanProgressDashboard from "@/features/finance/slipScanner/components/ScanProgressDashboard";
import { isNativeGalleryAvailable, pickSlipImages } from "@/features/finance/slipScanner/gallery/pickImages";
import { useFullGalleryScan } from "@/features/finance/slipScanner/hooks/useFullGalleryScan";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  // Fires once, with every candidate found, when the scan reaches "completed".
  onComplete: (candidates: SlipCandidate[]) => void;
  // Injectable so tests can supply a fake instead of the real jsQR + Tesseract
  // pipeline (mirrors useSlipScan's extractor param).
  extractor?: SlipExtractor;
}

// The orchestrator-backed scan experience (Slip Intelligence Phase 7): the
// same picking mechanisms GalleryScanFlow already uses (native picker or web
// file input), but processed through the real scan orchestration
// (useFullGalleryScan -> createScanSession, concurrent queue, byte budget,
// cache) instead of a plain sequential loop, with a live progress dashboard
// and pause/resume/cancel. Deliberately does not flag same-batch near-
// duplicates the way the bounded picker flow (useSlipScan) does -- that
// logic depends on strict sequential processing order, which the concurrent
// queue does not guarantee; cross-batch duplicate protection against the
// existing ledger still applies at import time via Smart Import regardless.
export default function FullGalleryScanPanel({ onComplete, extractor }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useFullGalleryScan(extractor);
  // useScanStore is a global singleton, so a freshly mounted panel can
  // observe an already-"completed" status left over from a previous scan
  // elsewhere in the app -- seeding the ref from the first-seen status (rather
  // than defaulting to false) means only an actual running/paused -> completed
  // transition fires onComplete, never a stale status inherited on mount.
  const prevStatusRef = useRef(scan.status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = scan.status;
    if (scan.status === "completed" && prev !== "completed") onComplete(scan.candidates);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per completed run, not on every candidates/onComplete identity change
  }, [scan.status]);

  async function handleStart(): Promise<void> {
    if (isNativeGalleryAvailable()) {
      const files = await pickSlipImages();
      if (files.length > 0) await scan.scanPickedFiles(files, false);
    } else {
      inputRef.current?.click();
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) await scan.scanPickedFiles(files, false);
  }

  // "cancelled"/"error" can still start a fresh scan; "running"/"paused" show
  // the controls instead. These aren't each other's negation ("completed"
  // and "idle" show neither), so both are their own checks.
  const canStart = scan.status === "idle" || scan.status === "completed" || scan.status === "cancelled" || scan.status === "error";
  const running = scan.status === "running" || scan.status === "paused";

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="sr-only" />

      {canStart && (
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {t("slipScanner.bankSelect.startScan")}
        </button>
      )}
      {running && (
        <ScanControls running={scan.status === "running"} onPause={scan.pause} onResume={scan.resume} onCancel={scan.cancel} />
      )}

      {scan.error && <p className="text-sm text-red-500">{t("slipScanner.progressDashboard.statusError", { error: scan.error })}</p>}
      {scan.status === "cancelled" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.progressDashboard.statusCancelled")}</p>
      )}

      {scan.snapshot && <ScanProgressDashboard progress={scan.snapshot} />}
    </div>
  );
}
