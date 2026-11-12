import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Images } from "lucide-react";
import { App } from "@capacitor/app";

import { prewarmOcr } from "@/features/finance/slipScanner/engine/ocr/ocrWorkerPool";
import ScanSuccessBurst from "@/features/finance/slipScanner/components/ScanSuccessBurst";
import ScanProgressRing from "@/features/finance/slipScanner/components/ScanProgressRing";
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
import { scanCandidateRepository } from "@/features/finance/slipScanner/repositories/scanCandidateRepository";
import ScannerDiagnosticsPanel from "@/features/finance/slipScanner/components/ScannerDiagnosticsPanel";
import { runManualGalleryScan } from "@/features/finance/slipScanner/services/manualGalleryScan";
import { AUTOMATIC_GALLERY_SCAN_MODE, scannerSafeVerificationMode } from "@/features/finance/slipScanner/services/scannerMode";
import { recordScannerDiagnostic } from "@/features/finance/slipScanner/services/scannerDiagnostics";

type Phase = "idle" | "banks";

// React Strict Mode can mount the page twice in development. Keep the native
// gallery scan single-flight at module scope so that never creates two scan
// sessions or duplicate previews.
let automaticScanInFlight = false;

const AUTO_SCAN_WINDOW_MS = 30 * 86_400_000;

interface Props {
  // Injectable so tests can supply a fake instead of the real jsQR + Tesseract
  // pipeline (injectable so tests can supply a deterministic extractor).
  extractor?: SlipExtractor;
  // Background gallery enumeration is kept opt-in for shared entry points so
  // mounting the scanner on every route does not start a native scan by itself.
  automaticScan?: boolean;
  // Shared entry points can open the setup drawer immediately after the lazy
  // scanner bundle finishes loading.
  initialOpen?: boolean;
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
export default function GalleryScanFlow({ extractor, automaticScan = true, initialOpen = false }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingWebDateRangeRef = useRef<ScanOptions["dateRange"]>(undefined);

  const [phase, setPhase] = useState<Phase>(() => (initialOpen ? "banks" : "idle"));
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rangeImageCount, setRangeImageCount] = useState<number | null>(null);
  const [isAutomaticScan, setIsAutomaticScan] = useState(false);
  const [runInBackground, setRunInBackground] = useState(false);
  const [burstCount, setBurstCount] = useState<number | null>(null);
  const [scanSettled, setScanSettled] = useState(false);
  const [reviewCandidates, setReviewCandidates] = useState<SlipCandidate[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const autoImportStartedRef = useRef(false);
  const scanOriginRef = useRef<"manual" | "automatic">("manual");

  const scan = useFullGalleryScan(extractor);
  const markScanned = useScanScheduleStore((state) => state.markScanned);
  // The resume listener outlives any single render, so it reads the latest
  // scan controller through a ref instead of capturing a stale closure.
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  });

  // On Android, scan only new gallery images when the app opens and every time
  // it returns to the foreground. The OS permission is requested once;
  // afterwards this is hands-free and the persistent scan cache prevents
  // rescanning the same image. Schedule config and last-scan time are read
  // fresh from the store on every trigger, so the Settings toggle applies
  // immediately and resume triggers are throttled by decideScan.
  useEffect(() => {
    if (!automaticScan || !isNativeGalleryAvailable()) return;

    let active = true;

    async function runAutomaticScan(trigger: "startup" | "resume"): Promise<void> {
      if (automaticScanInFlight) return;
      automaticScanInFlight = true;
      try {
        const { config, lastScanAt } = useScanScheduleStore.getState();
        // Cheap policy check first so a disabled/throttled trigger never
        // surfaces an OS permission prompt.
        const decision = decideScan({ trigger, config, device: await getDeviceState(), lastScanAt });
        if (!decision.shouldScan || !active) return;

        let permission = await galleryPermissionService.check();
        recordScannerDiagnostic("PERMISSION_CHECK");
        if (permission.status === "prompt" || permission.status === "denied") {
          permission = await galleryPermissionService.request();
        }
        if (!permission.canScanGallery || !active) {
          recordScannerDiagnostic("PERMISSION_DENIED", { errorCategory: "permission" });
          // Only on app open: a resume can fire every few minutes, and
          // repeating the error each time would nag someone who said no.
          if (active && trigger === "startup") toast.error(t(permission.status === "blocked" ? "slipScanner.galleryScan.permissionBlocked" : "slipScanner.galleryScan.permissionDenied"));
          return;
        }
        recordScannerDiagnostic("PERMISSION_GRANTED");

        autoImportStartedRef.current = false;
        setRunInBackground(false);
        setIsAutomaticScan(true);
        scanOriginRef.current = "automatic";
        // Hands-free scans only look at recent photos (last 30 days, or since
        // the last scan if the app was closed longer): reading every photo of a
        // large gallery in full resolution is far too slow for an automatic
        // run. The scan cache still skips anything already handled, and the
        // manual "Scan Gallery" button covers the whole gallery.
        const windowStart = Date.now() - AUTO_SCAN_WINDOW_MS;
        const sinceCursor = new Date(
          lastScanAt !== null ? Math.min(windowStart, lastScanAt - 86_400_000) : windowStart,
        ).toISOString();
        await scanRef.current.scanNativeGallery(
          AUTOMATIC_GALLERY_SCAN_MODE.incremental,
          undefined,
          AUTOMATIC_GALLERY_SCAN_MODE.exhaustive,
          sinceCursor,
        );
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
    }

    void runAutomaticScan("startup");
    const listenerPromise = App.addListener("resume", () => {
      void runAutomaticScan("resume");
    });

    return () => {
      active = false;
      void listenerPromise.then((handle) => handle.remove());
    };
    // Re-subscribing on every render would drop in-flight triggers; all
    // changing inputs are read through refs/getState above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automaticScan]);

  // Completed scans can leave OCR candidates waiting for a person to review.
  // Restore them before allowing another scan so closing the app does not
  // silently discard a financial record that still needs confirmation.
  useEffect(() => {
    let active = true;
    void scanCandidateRepository.listCompletedRuns().then((pending) => {
      if (!active || pending.length === 0) return;
      // Restored silently: the "Review pending" button shows the count, the
      // sheet opens only when the person taps it.
      setReviewCandidates(pending);
    });
    return () => {
      active = false;
    };
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
    setRunInBackground(false);
    const dateRange: ScanOptions["dateRange"] =
      dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined;
    // A date range is a one-off request, not a remembered preference (unlike
    // bank selection) -- clear it once consumed so the next scan defaults
    // back to the whole gallery.
    setDateFrom("");
    setDateTo("");
    scanOriginRef.current = "manual";
    if (isNativeGalleryAvailable()) {
      try {
        const started = await runManualGalleryScan({
          scan: scan.scanNativeGallery,
          dateRange,
        onPermissionUnavailable: (permission) => {
            const key = permission.status === "blocked"
              ? "slipScanner.galleryScan.permissionBlocked"
              : permission.status === "unavailable"
                ? "slipScanner.galleryScan.permissionUnavailable"
            : "slipScanner.galleryScan.permissionDenied";
            toast.error(t(key));
          },
        });
        if (started) setScanSettled(true);
      } catch (err) {
        toast.error(toErrorMessage(err));
        scan.reset();
      }
    } else {
      pendingWebDateRangeRef.current = dateRange;
      // Browser security requires an explicit folder choice. The directory
      // attribute lets Chromium/Edge recursively return the selected folder;
      // browsers without support gracefully keep their normal multi-file
      // picker instead of failing the action.
      inputRef.current?.setAttribute("webkitdirectory", "");
      inputRef.current?.setAttribute("directory", "");
      inputRef.current?.click();
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/") || /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name),
    );
    event.target.value = "";
    const dateRange = pendingWebDateRangeRef.current;
    pendingWebDateRangeRef.current = undefined;
    if (files.length === 0) {
      toast.error(t("slipScanner.galleryScan.noImagesSelected"));
      return;
    }
    try {
      await scan.scanPickedFiles(files, false, dateRange);
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
      if (count > 0) setBurstCount(count);

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

    if (scanOriginRef.current === "manual") {
      setReviewCandidates(visibleCandidates);
      if (visibleCandidates.length === 0) {
        toast.error(t("slipScanner.galleryScan.noneFound"));
        scan.reset();
        return;
      }
      recordScannerDiagnostic("REVIEW_REACHED", { count: visibleCandidates.length });
      scan.reset({ preserveCandidateIds: visibleCandidates.map((candidate) => candidate.id) });
      setReviewOpen(true);
      return;
    }

    const candidatesToImport = visibleCandidates.filter(isVerifiedQrCandidate);
    const candidatesForReview = visibleCandidates.filter((candidate) => !isVerifiedQrCandidate(candidate));
    setReviewCandidates(candidatesForReview);
    if (candidatesToImport.length === 0) {
      if (visibleCandidates.length > 0) {
        toast.error(t("slipScanner.galleryScan.noVerifiedQr"));
        // A hands-free scan never pops the sheet open by itself: it leaves the
        // "Review pending" button instead (a scan the person started opened
        // the sheet above).
        scan.reset({ preserveCandidateIds: candidatesForReview.map((candidate) => candidate.id) });
      } else {
        toast.error(t("slipScanner.galleryScan.noneFound"));
        scan.reset();
      }
      return;
    }

    const skippedUnverified = visibleCandidates.length - candidatesToImport.length;
    if (skippedUnverified > 0) {
      toast.info(t("slipScanner.galleryScan.unverifiedSkipped", { count: skippedUnverified }));
    }

    void (async () => {
      const result = await handleImport(candidatesToImport);
      if (!result) {
        scan.reset({ preserveCandidateIds: visibleCandidates.map((candidate) => candidate.id) });
        setReviewCandidates(visibleCandidates);
        return;
      }

      const resolvedIds = new Set([
        ...result.importedCandidateIds,
        ...result.skippedDuplicates.map((item) => item.candidateId),
      ]);
      await scan.removeCandidates(resolvedIds);

      const failedIds = new Set(result.failed.map((item) => item.candidateId));
      const remaining = visibleCandidates.filter(
        (candidate) => !resolvedIds.has(candidate.id) && (!isVerifiedQrCandidate(candidate) || failedIds.has(candidate.id)),
      );
      setReviewCandidates(remaining);
      scan.reset({ preserveCandidateIds: remaining.map((candidate) => candidate.id) });
    })();
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
  // The hands-free scan gets a full-screen ring so it is hard to miss; the
  // person can send it to the background and it keeps running behind the
  // small indicator + Cancel button.
  const showAutoRing = isAutomaticScan && busy && !runInBackground;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Warm OCR while the person picks banks/files, so the scan itself
          // doesn't start with a long engine + language-data load.
          prewarmOcr();
          setPhase("banks");
        }}
        disabled={busy || smartImport.running || reviewCandidates.length > 0}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Images size={18} className={isAutomaticScan ? "animate-pulse text-brand-400" : ""} />
        {isAutomaticScan ? t("slipScanner.galleryScan.scanningNew") : t("transactions.scanGallery")}
      </button>

      {isAutomaticScan && busy && (
        <button
          type="button"
          onClick={scan.cancel}
          className="min-h-11 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t("slipScanner.galleryScan.cancelAutoScan")}
        </button>
      )}

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
        webFolderSelection={!isNativeGalleryAvailable()}
      />

      {showScanOverlay && !runInBackground && (
        <ScanProgressRing
          progress={scan.snapshot}
          running={scan.status === "running"}
          onPause={scan.pause}
          onResume={scan.resume}
          onCancel={scan.cancel}
          onBackground={() => setRunInBackground(true)}
          showDetails
        />
      )}

      {burstCount !== null && <ScanSuccessBurst count={burstCount} onDone={() => setBurstCount(null)} />}

      {showAutoRing && (
        <ScanProgressRing
          progress={scan.snapshot}
          running={scan.status === "running"}
          onPause={scan.pause}
          onResume={scan.resume}
          onCancel={scan.cancel}
          onBackground={() => setRunInBackground(true)}
        />
      )}

      <ImportPreview
        open={reviewOpen}
        onClose={closeReview}
        candidates={reviewCandidates}
        safeVerificationMode={scannerSafeVerificationMode}
        onImport={async (selected) => {
          const result = await handleImport(selected);
          if (!result) return;

          const resolvedIds = new Set([
            ...result.importedCandidateIds,
            ...result.skippedDuplicates.map((item) => item.candidateId),
          ]);
          await scan.removeCandidates(resolvedIds);
          const remaining = reviewCandidates.filter((candidate) => !resolvedIds.has(candidate.id));
          setReviewCandidates(remaining);
          if (remaining.length === 0) setReviewOpen(false);
        }}
      />

      {scannerSafeVerificationMode && (
        <div role="status" className="fixed left-3 top-20 z-[80] max-w-sm rounded-xl border border-amber-500 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 shadow-lg dark:bg-amber-950 dark:text-amber-100">
          {t("slipScanner.diagnostics.safeMode")}
        </div>
      )}
      <ScannerDiagnosticsPanel />

    </>
  );
}
