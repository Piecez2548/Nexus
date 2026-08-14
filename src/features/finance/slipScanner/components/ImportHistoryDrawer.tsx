import { AlertTriangle, CheckCircle2, Search, Trash2, XCircle } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { useImportHistory, type ImportHistoryStatusFilter } from "@/features/finance/slipScanner/hooks/useImportHistory";
import type { ImportHistoryEntry, ImportStatus } from "@/features/finance/slipScanner/models/importHistory";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_FILTERS: ImportHistoryStatusFilter[] = ["all", "success", "partial", "failed"];
const FILTER_LABEL_KEY: Record<ImportHistoryStatusFilter, string> = {
  all: "slipScanner.importHistory.filterAll",
  success: "slipScanner.importHistory.statusSuccess",
  partial: "slipScanner.importHistory.statusPartial",
  failed: "slipScanner.importHistory.statusFailed",
};

const STATUS_ICON: Record<ImportStatus, typeof CheckCircle2> = {
  success: CheckCircle2,
  partial: AlertTriangle,
  failed: XCircle,
};
const STATUS_CLASSES: Record<ImportStatus, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  failed: "text-red-600 dark:text-red-400",
};

function formatEntry(entry: ImportHistoryEntry): string {
  return new Date(entry.importedAt).toLocaleString();
}

// Import History (GS-035): every Smart Import batch run on this device, with
// search + status filter. Read-only log — the repository/filter logic already
// existed and was fully tested but had no UI, so this is that missing view.
export default function ImportHistoryDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useImportHistory();

  async function handleClear(): Promise<void> {
    if (!window.confirm(t("slipScanner.importHistory.clearConfirm"))) return;
    await history.clear();
    toast.success(t("slipScanner.importHistory.cleared"));
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div>
          <h2 className="text-xl font-bold">{t("slipScanner.importHistory.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.importHistory.subtitle")}</p>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={history.search}
            onChange={(e) => history.setSearch(e.target.value)}
            placeholder={t("slipScanner.importHistory.searchPlaceholder")}
            aria-label={t("slipScanner.importHistory.searchPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("slipScanner.importHistory.filterAll")}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => history.setStatusFilter(filter)}
              aria-pressed={history.statusFilter === filter}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                history.statusFilter === filter
                  ? "bg-brand-600 text-white"
                  : "border border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
              }`}
            >
              {t(FILTER_LABEL_KEY[filter])}
            </button>
          ))}
        </div>

        {history.visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("slipScanner.importHistory.empty")}
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {history.visible.map((entry) => {
              const StatusIcon = STATUS_ICON[entry.status];
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon size={16} className={STATUS_CLASSES[entry.status]} />
                    <span className="font-medium">{entry.bank ?? t("slipScanner.importPreview.unknownBank")}</span>
                    <span className="ml-auto text-xs text-zinc-400">{formatEntry(entry)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{t("slipScanner.importHistory.importedCount", { count: entry.importedCount })}</span>
                    {entry.failedCount > 0 && (
                      <span>{t("slipScanner.importHistory.failedCount", { count: entry.failedCount })}</span>
                    )}
                    {entry.amount !== undefined && <span className="font-semibold">{entry.amount.toLocaleString()}</span>}
                  </div>
                  {entry.errors && entry.errors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs text-red-500">
                      {entry.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={handleClear}
          disabled={history.entries.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 size={16} />
          {t("slipScanner.importHistory.clear")}
        </button>
      </div>
    </Drawer>
  );
}
