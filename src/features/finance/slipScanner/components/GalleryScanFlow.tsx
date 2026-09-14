import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Images } from "lucide-react";

import ScanControls from "@/features/finance/slipScanner/components/ScanControls";
import ScanProgressDashboard from "@/features/finance/slipScanner/components/ScanProgressDashboard";
import ImportPreview from "@/features/finance/slipScanner/components/ImportPreview";
import { useFullGalleryScan } from "@/features/finance/slipScanner/hooks/useFullGalleryScan";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { isNativeGalleryAvailable } from "@/features/finance/slipScanner/gallery/pickImages";
import { NativeMediaProvider } from "@/features/finance/slipScanner/gallery/media/NativeMediaProvider";
import { galleryPermissionService } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionService";
import type { ScanOptions } from "@/features/finance/slipScanner/models/scanTypes";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import BankSelectionPopup from "@/features/finance/slipScanner/components/BankSelectionPopup";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useToast } from "@/hooks/useToast";
import { toErrorMessage } from "@/utils/asyncState";
import { useTranslation } from "@/i18n/useTranslation";
import { decideScan } from "@/features/finance/slipScanner/schedule/scanScheduler";
import { getDeviceState } from "@/features/finance/slipScanner/schedule/deviceState";
import { useScanScheduleStore } from "@/features/finance/slipScanner/store/scanScheduleStore";
import { isVerifiedQrCandidate } from "@/features/finance/slipScanner/ai/confidenceTier";

type Phase = "idle" | "banks";

// React Strict Mode can mount the page twice in development. Keep the native
// gallery scan single-flight at module scope so that never creates two scan
// sessions or duplicate previews.
let automaticScanInFlight = false;

interface Props {
  // Injectable so tests can supply a fake instead of the real jsQR + Tesseract
  // pipeline (injectable so tests can supply a deterministic extractor).
  extractor?: SlipExtractor;
}

// The live Gallery Scanner entry point: a Scan button that drives the whole
// flow — pick banks → scan (native: real MediaStore auto-enumeration via the
// GalleryMediaPlugin adapter, GS-006/007/008 + Slip Intelligence Phase 8;
// web: file picker, since there is no OS gallery to enumerate) → extract
// slips (real jsQR + Tesseract, through the concurrent scan orchestrator) →
// Smart Import. All the pieces (BankSelectionPopup, useFullGalleryScan,
// ScanProgressDashboard and useSmartImport) are tested units
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rangeImageCount, setRangeImageCount] = useState<number | null>(null);
  const [isAutomaticScan, setIsAutomaticScan] = useState(false);
  const [scanSettled, setScanSettled] = useState(false);
  const [reviewCandidates, setReviewCandidates] = useState<SlipCandidate[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const autoImportStartedRef = useRef(false);

  const scan = useFullGalleryScan(extractor);
  const scheduleConfig = useScanScheduleStore((state) => state.config);
  const lastScanAt = useScanScheduleStore((state) => state.lastScanAt);
  const markScanned = useScanScheduleStore((state) => state.markScanned);

  // On Android, scan only new gallery images when the transaction page opens.
  // The OS permission is requested once; subsequent visits are hands-free and
  // the persistent scan cache prevents rescanning the same image.
  useEffect(() => {
    if (!isNativeGalleryAvailable() || automaticScanInFlight) return;

    let active = true;
    automaticScanInFlight = true;

    void (async () => {
      try {
        let permission = await galleryPermissionService.check();
        if (permission.status === "prompt" || permission.status === "denied") {
          permission = await galleryPermissionService.request();
        }
        if (!permission.canScanGallery || !active) return;

        const decision = decideScan({
          trigger: "scheduled",
          config: scheduleConfig,
          device: await getDeviceState(),
          lastScanAt,
        });
        if (!decision.shouldScan || !active) return;

        setIsAutomaticScan(true);
        await scan.scanNativeGallery(true);
        if (active) {
          markScanned();
          setScanSettled(true);
        }
      } catch (err) {
        if (active) {
          toast.error(toErrorMessage(err));
          setScanSettled(true);
        }
      } finally {
        automaticScanInFlight = false;
        if (active) setIsAutomaticScan(false);
      }
    })();

    return () => {
      active = false;
    };
    // Run once for this page visit. Schedule values are intentionally captured
    // at entry; changing settings applies on the next visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live "N photos in this range" estimate as the user adjusts the date
  // fields -- only meaningful on native (the web picker has no gallery to
  // count ahead of time). A request id guards against an in-flight older
  // count() resolving after a newer one and clobbering it.
  useEffect(() => {
    if (phase !== "banks" || !isNativeGalleryAvailable()) return;
    if (!dateFrom && !dateTo) {
      setRangeImageCount(null);
      return;
    }

    let cancelled = false;
    void new NativeMediaProvider()
      .count({ since: dateFrom || undefined, until: dateTo || undefined })
      .then((total) => {
        if (!cancelled) setRangeImageCount(total);
      })
      .catch(() => {
        if (!cancelled) setRangeImageCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [phase, dateFrom, dateTo]);
  const smartImport = useSmartImport();

  async function handleConfirmBanks(bankIds: string[]): Promise<void> {
    if (bankIds.length === 0) {
      // The one-tap "scan all" action should apply an unfiltered run without
      // replacing the user's remembered bank preference for the next filtered
      // scan.
      useBankSelectionStore.getState().reset();
    }
    setSelectedBankIds(bankIds);
    setPhase("idle"); // close the popup before scanning
    setScanSettled(false);
    autoImportStartedRef.current = false;
    const dateRange: ScanOptions["dateRange"] =
      dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined;
    // A date range is a one-off request, not a remembered preference (unlike
    // bank selection) -- clear it once consumed so the next scan defaults
    // back to the whole gallery.
    setDateFrom("");
    setDateTo("");
    if (isNativeGalleryAvailable()) {
      try {
        await scan.scanNativeGallery(true, dateRange);
        setScanSettled(true);
      } catch (err) {
        toast.error(toErrorMessage(err));
        setScanSettled(true);
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
      setScanSettled(true);
    } catch (err) {
      toast.error(toErrorMessage(err));
      setScanSettled(true);
    }
  }

  // Bank selection acts as a filter on results; unknown-bank slips (OCR-only,
  // no rail identified) are always kept so nothing is silently dropped.
  const visibleCandidates = useMemo(
    () =>
      scan.candidates.filter(
        (c) => selectedBankIds.length === 0 || !c.bankId || selectedBankIds.includes(c.bankId),
      ),
    [scan.candidates, selectedBankIds],
  );

  async function handleImport(selected: SlipCandidate[]): Promise<Awaited<ReturnType<typeof smartImport.importCandidates>> | null> {
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
      return result;
    } catch (err) {
      toast.error(toErrorMessage(err));
      return null;
    }
  }

  // Gallery scans import verified QR candidates as soon as the scan settles.
  // OCR and otherwise unverified candidates stay in the existing Import
  // Preview so a person can correct and explicitly import them. Smart Import
  // still owns validation, duplicate detection, history, and persistence.
  useEffect(() => {
    if (!scanSettled || autoImportStartedRef.current) return;

    autoImportStartedRef.current = true;
    setScanSettled(false);

    if (scan.status === "cancelled") {
      scan.reset();
      toast.info(t("slipScanner.progressDashboard.statusCancelled"));
      return;
    }
    if (scan.status === "error") {
      scan.reset();
      toast.error(t("slipScanner.progressDashboard.statusError", { error: scan.error ?? "" }));
      return;
    }

    const candidatesToImport = visibleCandidates.filter(isVerifiedQrCandidate);
    const candidatesForReview = visibleCandidates.filter((candidate) => !isVerifiedQrCandidate(candidate));
    setReviewCandidates(candidatesForReview);
    if (candidatesToImport.length === 0) {
      scan.reset();
      if (visibleCandidates.length > 0) {
        toast.error(t("slipScanner.galleryScan.noVerifiedQr"));
        setReviewOpen(candidatesForReview.length > 0);
      } else {
        toast.error(t("slipScanner.galleryScan.noneFound"));
      }
      return;
    }

    const skippedUnverified = visibleCandidates.length - candidatesToImport.length;
    if (skippedUnverified > 0) {
      toast.info(t("slipScanner.galleryScan.unverifiedSkipped", { count: skippedUnverified }));
    }

    void handleImport(candidatesToImport).then(() => {
      if (candidatesForReview.length > 0) setReviewOpen(true);
    });
    // scanSettled is the explicit completion signal from the scan promise, so
    // candidates are fully populated before this effect can import them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanSettled]);

  function closeReview(): void {
    setReviewOpen(false);
  }

  const busy = scan.status === "running" || scan.status === "paused";
  // Shown only while actually in flight -- "completed"/"cancelled"/"error"
  // are all communicated via toast (above) and don't need a lingering modal,
  // which would otherwise have nothing to dismiss it.
  const showScanOverlay = phase === "idle" && busy && !isAutomaticScan;

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("banks")}
        disabled={busy || smartImport.running || reviewCandidates.length > 0}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Images size={18} className={isAutomaticScan ? "animate-pulse text-brand-400" : ""} />
        {isAutomaticScan ? t("slipScanner.galleryScan.scanningNew") : t("transactions.scanGallery")}
      </button>

      {reviewCandidates.length > 0 && !reviewOpen && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="rounded-xl border border-brand-300 px-4 py-2 font-medium text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950/30"
        >
          {t("slipScanner.galleryScan.reviewPending", { count: reviewCandidates.length })}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        aria-label={t("transactions.scanGallery")}
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="sr-only"
      />

      <BankSelectionPopup
        open={phase === "banks"}
        onClose={() => setPhase("idle")}
        onConfirm={handleConfirmBanks}
        imageCount={rangeImageCount}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
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
        open={reviewOpen}
        onClose={closeReview}
        candidates={reviewCandidates}
        onImport={async (selected) => {
          const result = await handleImport(selected);
          if (!result) return;

          const resolvedIds = new Set([
            ...result.importedCandidateIds,
            ...result.skippedDuplicates.map((item) => item.candidateId),
          ]);
          const remaining = reviewCandidates.filter((candidate) => !resolvedIds.has(candidate.id));
          setReviewCandidates(remaining);
          if (remaining.length === 0) setReviewOpen(false);
        }}
      />

    </>
  );
}
