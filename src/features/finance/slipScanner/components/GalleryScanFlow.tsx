import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Images } from "lucide-react";

import { useSlipScan } from "@/features/finance/slipScanner/hooks/useSlipScan";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { isNativeGalleryAvailable, pickSlipImages } from "@/features/finance/slipScanner/gallery/pickImages";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import BankSelectionPopup from "@/features/finance/slipScanner/components/BankSelectionPopup";
import ImportPreview from "@/features/finance/slipScanner/components/ImportPreview";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useToast } from "@/hooks/useToast";
import { toErrorMessage } from "@/utils/asyncState";
import { useTranslation } from "@/i18n/useTranslation";

type Phase = "idle" | "banks" | "preview";

// The live Gallery Scanner entry point: a Scan button that drives the whole
// flow — pick banks → pick images (native gallery on device, file picker on
// web) → extract slips (real jsQR + Tesseract) → review → Smart Import. All the
// pieces (BankSelectionPopup, useSlipScan, ImportPreview, useSmartImport) are
// the tested units built across the GS epic; this only orchestrates them.
export default function GalleryScanFlow() {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const slipScan = useSlipScan();
  const smartImport = useSmartImport();

  async function runScan(files: File[]): Promise<void> {
    if (files.length === 0) return;
    try {
      const results = await slipScan.scan(files);
      if (results.length === 0) {
        toast.error(t("slipScanner.galleryScan.noneFound"));
        return;
      }
      setPhase("preview");
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  async function handleConfirmBanks(bankIds: string[]): Promise<void> {
    setSelectedBankIds(bankIds);
    setPhase("idle"); // close the popup before picking
    if (isNativeGalleryAvailable()) {
      try {
        await runScan(await pickSlipImages());
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
    await runScan(files);
  }

  // Bank selection acts as a filter on results; unknown-bank slips (OCR-only,
  // no rail identified) are always kept so nothing is silently dropped.
  const visibleCandidates = useMemo(
    () => slipScan.candidates.filter((c) => !c.bankId || selectedBankIds.includes(c.bankId)),
    [slipScan.candidates, selectedBankIds],
  );

  async function handleImport(selected: SlipCandidate[]): Promise<void> {
    try {
      const categoryNames = new Set(useCategoryStore.getState().categories.map((c) => c.name));
      const result = await smartImport.importCandidates(selected, {
        fallbackTitle: t("slipScanner.defaultTitle"),
        learnedCategories: useCategoryLearningStore.getState().asMap(),
        validCategoryNames: categoryNames,
      });
      const count = result.importedIds.length;
      const failed = result.failed.length;

      if (failed === 0) {
        toast.success(t("slipScanner.galleryScan.imported", { count }));
      } else if (count > 0) {
        toast.error(t("slipScanner.galleryScan.importedPartial", { count, failed }));
      } else {
        toast.error(t("slipScanner.galleryScan.importFailed", { failed }));
      }

      slipScan.reset();
      setPhase("idle");
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  function closePreview(): void {
    slipScan.reset();
    setPhase("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("banks")}
        disabled={slipScan.scanning}
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

      {slipScan.scanning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 shadow-lg">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-500" />
            <span className="text-sm">
              {slipScan.progress
                ? t("slipScanner.galleryScan.scanning", {
                    done: slipScan.progress.done,
                    total: slipScan.progress.total,
                  })
                : t("slipScanner.scanning")}
            </span>
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
