import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useWatchlistStore } from "@/features/trading/store/watchlistStore";
import { getMarketLabels } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import MobileRowCard from "@/components/ui/MobileRowCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { WatchlistItem } from "@/features/trading/types";

interface Props {
  items: WatchlistItem[];
  onEdit: (item: WatchlistItem) => void;
}

export default function WatchlistTable({ items, onEdit }: Props) {
  const { deleteWatchlistItem } = useWatchlistStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const marketLabels = getMarketLabels(t);

  async function handleDelete(item: WatchlistItem) {
    if (item.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteWatchlistItem(item.id);
      toast.success(t("watchlist.deletedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <MobileRowCard
            key={item.id}
            title={item.symbol}
            subtitle={marketLabels[item.market]}
            trailing={item.targetPrice !== undefined ? <span className="text-base font-bold">{item.targetPrice}</span> : undefined}
            meta={item.notes ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.notes}</span> : undefined}
            actions={
              <>
                <button
                  onClick={() => onEdit(item)}
                  aria-label={t("common.editName", { name: item.symbol })}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(item)}
                  aria-label={t("common.deleteName", { name: item.symbol })}
                  className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </>
            }
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-950">
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
                <th className="px-6 py-4 text-left">{t("trading.symbol")}</th>
                <th className="px-6 py-4 text-left">{t("trading.market")}</th>
                <th className="px-6 py-4 text-right">{t("watchlist.targetPriceLabel")}</th>
                <th className="px-6 py-4 text-left">{t("trading.notesLabel")}</th>
                <th className="px-6 py-4 text-center">{t("common.action")}</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-6 py-4 font-medium">{item.symbol}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{marketLabels[item.market]}</td>
                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">{item.targetPrice ?? "-"}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">{item.notes ?? "-"}</td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => onEdit(item)}
                        aria-label={t("common.editName", { name: item.symbol })}
                        className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        aria-label={t("common.deleteName", { name: item.symbol })}
                        className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
