import { Check, Search } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { useBankSelection } from "@/features/finance/slipScanner/hooks/useBankSelection";
import type { ScanEstimate } from "@/features/finance/slipScanner/selection/bankSelection";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslateFn } from "@/i18n/useTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedBankIds: string[]) => void;
  imageCount?: number | null;
  // Date-range scoping (optional) -- both blank scans the whole gallery,
  // matching today's default. Kept as controlled props (state lives in
  // GalleryScanFlow, which also owns the live imageCount fetch) so this
  // component stays purely presentational, matching its existing convention.
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
}

function formatDuration(estimate: ScanEstimate, t: TranslateFn): string {
  if (estimate.totalSeconds === null) return t("slipScanner.bankSelect.unknown");
  if (estimate.totalSeconds < 60) return t("slipScanner.bankSelect.durationSec", { s: estimate.totalSeconds });
  const m = Math.floor(estimate.totalSeconds / 60);
  const s = estimate.totalSeconds % 60;
  return t("slipScanner.bankSelect.durationMinSec", { m, s });
}

const pillButton =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:border-brand-500 hover:text-brand-500";

// Pre-scan popup (GS-014): pick which banks' slips to import, with search,
// select-all / deselect-all / quick-select, a remembered selection, and an
// estimated image count + scan time. All selection logic lives in
// useBankSelection; this stays presentational. Reuses the shared Drawer.
export default function BankSelectionPopup({
  open,
  onClose,
  onConfirm,
  imageCount = null,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
}: Props) {
  const { t } = useTranslation();
  const selection = useBankSelection(imageCount);

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div>
          <h2 className="text-xl font-bold">{t("slipScanner.bankSelect.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.bankSelect.subtitle")}</p>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={selection.query}
            onChange={(e) => selection.setQuery(e.target.value)}
            placeholder={t("slipScanner.bankSelect.searchPlaceholder")}
            aria-label={t("slipScanner.bankSelect.searchPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        {(onDateFromChange || onDateToChange) && (
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("slipScanner.bankSelect.dateRangeLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-500">{t("slipScanner.bankSelect.dateFrom")}</span>
                <input
                  type="date"
                  aria-label={t("slipScanner.bankSelect.dateFrom")}
                  value={dateFrom}
                  onChange={(e) => onDateFromChange?.(e.target.value)}
                  max={dateTo || undefined}
                  className="w-0 min-w-[8.5rem] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-500">{t("slipScanner.bankSelect.dateTo")}</span>
                <input
                  type="date"
                  aria-label={t("slipScanner.bankSelect.dateTo")}
                  value={dateTo}
                  onChange={(e) => onDateToChange?.(e.target.value)}
                  min={dateFrom || undefined}
                  className="w-0 min-w-[8.5rem] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t("slipScanner.bankSelect.dateRangeHint")}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selection.selectAll} className={pillButton}>
            {t("slipScanner.bankSelect.selectAll")}
          </button>
          <button type="button" onClick={selection.deselectAll} className={pillButton}>
            {t("slipScanner.bankSelect.deselectAll")}
          </button>
          <button type="button" onClick={selection.quickSelect} className={pillButton}>
            {t("slipScanner.bankSelect.quickSelect")}
          </button>
          <span className="ml-auto self-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("slipScanner.bankSelect.selectedCount", { count: selection.selectedCount })}
          </span>
        </div>

        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {selection.banks.map((bank) => {
            const checked = selection.isSelected(bank.id);
            return (
              <li key={bank.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-zinc-200 dark:hover:border-zinc-800">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {checked && <Check size={14} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => selection.toggle(bank.id)}
                    className="sr-only"
                  />
                  <span className="font-medium">{bank.shortName}</span>
                  <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{bank.name}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
          <div>
            <div className="text-zinc-500 dark:text-zinc-400">{t("slipScanner.bankSelect.estImagesLabel")}</div>
            <div className="font-semibold">
              {selection.estimate.imageCount ?? t("slipScanner.bankSelect.unknown")}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 dark:text-zinc-400">{t("slipScanner.bankSelect.estTimeLabel")}</div>
            <div className="font-semibold">{formatDuration(selection.estimate, t)}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(selection.selectedIds)}
          disabled={selection.noneSelected}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("slipScanner.bankSelect.startScan")}
        </button>
        {selection.noneSelected && (
          <p className="text-center text-xs text-amber-500">{t("slipScanner.bankSelect.noneSelectedHint")}</p>
        )}
      </div>
    </Drawer>
  );
}
