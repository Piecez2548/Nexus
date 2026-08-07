import { Check, ImageOff, Search } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { useImportPreview } from "@/features/finance/slipScanner/hooks/useImportPreview";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { DuplicateFilter } from "@/features/finance/slipScanner/preview/importPreview";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
  candidates: SlipCandidate[];
  onImport: (selected: SlipCandidate[]) => void;
}

const DUPLICATE_FILTERS: DuplicateFilter[] = ["all", "unique", "duplicates"];
const FILTER_LABEL_KEY: Record<DuplicateFilter, string> = {
  all: "slipScanner.importPreview.filterAll",
  unique: "slipScanner.importPreview.filterUnique",
  duplicates: "slipScanner.importPreview.filterDuplicates",
};

const pillButton =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:border-brand-500 hover:text-brand-500";

// Import Preview (GS-015): lists the scanned slip candidates with thumbnail,
// bank, amount, date/time, merchant, a duplicate badge and a confidence score,
// with search, a duplicate filter, select-all, and Import Selected. All state
// lives in useImportPreview; this stays presentational. Reuses the shared Drawer.
export default function ImportPreview({ open, onClose, candidates, onImport }: Props) {
  const { t } = useTranslation();
  const preview = useImportPreview(candidates);

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div>
          <h2 className="text-xl font-bold">{t("slipScanner.importPreview.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.importPreview.subtitle")}</p>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={preview.search}
            onChange={(e) => preview.setSearch(e.target.value)}
            placeholder={t("slipScanner.importPreview.searchPlaceholder")}
            aria-label={t("slipScanner.importPreview.searchPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label={t("slipScanner.importPreview.filterAll")}>
            {DUPLICATE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => preview.setDuplicateFilter(filter)}
                aria-pressed={preview.duplicateFilter === filter}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  preview.duplicateFilter === filter
                    ? "bg-brand-600 text-white"
                    : "border border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
                }`}
              >
                {t(FILTER_LABEL_KEY[filter])}
              </button>
            ))}
          </div>
          <button type="button" onClick={preview.selectAllVisible} className={pillButton}>
            {t("slipScanner.importPreview.selectAll")}
          </button>
          <button type="button" onClick={preview.deselectAll} className={pillButton}>
            {t("slipScanner.importPreview.deselectAll")}
          </button>
        </div>

        {preview.visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("slipScanner.importPreview.empty")}
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {preview.visible.map((candidate) => {
              const checked = preview.isSelected(candidate.id);
              return (
                <li key={candidate.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {checked && <Check size={14} />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => preview.toggle(candidate.id)}
                      className="sr-only"
                    />

                    {candidate.thumbnailUrl ? (
                      <img
                        src={candidate.thumbnailUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                        <ImageOff size={18} />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {candidate.bankName ?? t("slipScanner.importPreview.unknownBank")}
                        </span>
                        {candidate.isDuplicate && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {t("slipScanner.importPreview.duplicateBadge")}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-zinc-400">
                          {candidate.source === "qr"
                            ? t("slipScanner.importPreview.sourceQr")
                            : t("slipScanner.importPreview.sourceOcr")}
                        </span>
                      </div>
                      <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {candidate.merchant ?? "—"}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold">
                          {candidate.amount !== undefined
                            ? `${candidate.amount.toLocaleString()}${candidate.currency ? ` ${candidate.currency}` : ""}`
                            : "—"}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {[candidate.date, candidate.time].filter(Boolean).join(" ") || "—"}
                        </span>
                        <span className="ml-auto text-xs text-zinc-400">
                          {t("slipScanner.importPreview.confidence")} {candidate.confidence}%
                        </span>
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => onImport(preview.selectedCandidates)}
          disabled={preview.selectedCount === 0}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("slipScanner.importPreview.importSelected", { count: preview.selectedCount })}
        </button>
      </div>
    </Drawer>
  );
}
