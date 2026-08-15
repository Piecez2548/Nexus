import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Images } from "lucide-react";

import ScanControls from "@/features/finance/slipScanner/components/ScanControls";
import ScanProgressDashboard from "@/features/finance/slipScanner/components/ScanProgressDashboard";
import { useFullGalleryScan } from "@/features/finance/slipScanner/hooks/useFullGalleryScan";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { isNativeGalleryAvailable } from "@/features/finance/slipScanner/gallery/pickImages";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import BankSelectionPopup from "@/features/finance/slipScanner/components/BankSelectionPopup";
import ImportPreview from "@/features/finance/slipScanner/components/ImportPreview";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useToast } from "@/hooks/useToast";
import { toErrorMessage } from "@/utils/asyncState";
import { useTranslation } from "@/i18n/useTranslation";

type Phase = "idle" | "banks" | "preview";

interface Props {
  // Injectable so tests can supply a fake instead of the real jsQR + Tesseract
  // pipeline (mirrors FullGalleryScanPanel's extractor param).
  extractor?: SlipExtractor;
}

// The live Gallery Scanner entry point: a Scan button that drives the whole
// flow — pick banks → scan (native: real MediaStore auto-enumeration via the
// GalleryMediaPlugin adapter, GS-006/007/008 + Slip Intelligence Phase 8;
// web: file picker, since there is no OS gallery to enumerate) → extract
// slips (real jsQR + Tesseract, through the concurrent scan orchestrator) →
// review → Smart Import. All the pieces (BankSelectionPopup, useFullGalleryScan,
// ScanProgressDashboard, ImportPreview, useSmartImport) are tested units
// built across the GS epic and Slip Intelligence phases; this only
// orchestrates them.
//
// Bank selection is a post-hoc filter on the scan's results, not a pre-scan
// restriction (an auto-enumerated gallery scan can't be narrowed ahead of
// time to "just these banks' slips" the way a manual picker could) — so it
// still gates *when* scanning starts (matching the existing UX), not *what*
// gets scanned.
export default function GalleryScanFlow({ extractor }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const scan = useFullGalleryScan(extractor);
  const smartImport = useSmartImport();

  // useScanStore is a module-level singleton, so a freshly mounted consumer
  // could otherwise inherit an already-"completed" status left over from a
  // previous scan elsewhere in the app — seeding from the first-seen status
  // means only an actual running/paused -> completed transition is acted on
  // (see FullGalleryScanPanel, where this exact bug was first found).
  const prevScanStatusRef = useRef(scan.status);

  useEffect(() => {
    const prev = prevScanStatusRef.current;
    prevScanStatusRef.current = scan.status;
    if (prev === scan.status) return; // no real transition (also guards a stale status inherited on mount)

    if (scan.status === "completed") {
      if (scan.candidates.length === 0) {
        toast.error(t("slipScanner.galleryScan.noneFound"));
      } else {
        setPhase("preview");
      }
    } else if (scan.status === "cancelled") {
      toast.info(t("slipScanner.progressDashboard.statusCancelled"));
    } else if (scan.status === "error") {
      toast.error(t("slipScanner.progressDashboard.statusError", { error: scan.error ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per real status transition, not on every candidates/toast/t identity change
  }, [scan.status]);

  async function handleConfirmBanks(bankIds: string[]): Promise<void> {
    setSelectedBankIds(bankIds);
    setPhase("idle"); // close the popup before scanning
    if (isNativeGalleryAvailable()) {
      try {
        await scan.scanNativeGallery();
      } catch (err) {
        toast.error(toErrorMessage(err));
      }
    } else {
      inputRef.current?.click();
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    try {
      await scan.scanPickedFiles(files, false);
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  // Bank selection acts as a filter on results; unknown-bank slips (OCR-only,
  // no rail identified) are always kept so nothing is silently dropped.
  const visibleCandidates = useMemo(
    () => scan.candidates.filter((c) => !c.bankId || selectedBankIds.includes(c.bankId)),
    [scan.candidates, selectedBankIds],
  );

  async function handleImport(selected: SlipCandidate[]): Promise<void> {
    try {
      // An empty list means categories haven't loaded (not "the user has zero
      // categories") — pass undefined then so resolveCategory skips validation
      // instead of forcing every import to "Others"/uncategorised.
      const liveCategories = useCategoryStore.getState().categories;
      const validCategoryNames = liveCategories.length > 0 ? new Set(liveCategories.map((c) => c.name)) : undefined;

      const result = await smartImport.importCandidates(selected, {
        fallbackTitle: t("slipScanner.defaultTitle"),
        learnedCategories: useCategoryLearningStore.getState().asMap(),
        validCategoryNames,
      });
      const count = result.importedIds.length;
      const failed = result.failed.length;
      const duplicates = result.skippedDuplicates.length;

      if (failed === 0 && duplicates === 0) {
        toast.success(t("slipScanner.galleryScan.imported", { count }));
      } else if (failed === 0 && count > 0) {
        toast.success(t("slipScanner.galleryScan.importedWithDuplicates", { count, duplicates }));
      } else if (failed === 0) {
        toast.error(t("slipScanner.galleryScan.allDuplicates", { duplicates }));
      } else if (count > 0) {
        toast.error(t("slipScanner.galleryScan.importedPartial", { count, failed }));
      } else {
        toast.error(t("slipScanner.galleryScan.importFailed", { failed }));
      }

      scan.reset();
      setPhase("idle");
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  function closePreview(): void {
    scan.reset();
    setPhase("idle");
  }

  const busy = scan.status === "running" || scan.status === "paused";
  // Shown only while actually in flight -- "completed"/"cancelled"/"error"
  // are all communicated via toast (above) and don't need a lingering modal,
  // which would otherwise have nothing to dismiss it.
  const showScanOverlay = phase === "idle" && busy;

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("banks")}
        disabled={busy}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Images size={18} />
        {t("transactions.scanGallery")}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="sr-only"
      />

      <BankSelectionPopup
        open={phase === "banks"}
        onClose={() => setPhase("idle")}
        onConfirm={handleConfirmBanks}
        imageCount={null}
      />

      {showScanOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg">
            {scan.snapshot && <ScanProgressDashboard progress={scan.snapshot} />}
            <ScanControls running={scan.status === "running"} onPause={scan.pause} onResume={scan.resume} onCancel={scan.cancel} />
          </div>
        </div>
      )}

      <ImportPreview
        open={phase === "preview"}
        onClose={closePreview}
        candidates={visibleCandidates}
        onImport={handleImport}
      />
    </>
  );
}
