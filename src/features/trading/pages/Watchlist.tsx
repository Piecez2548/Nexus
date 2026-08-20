import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useWatchlistStore } from "@/features/trading/store/watchlistStore";
import WatchlistTable from "@/features/trading/components/WatchlistTable";
import WatchlistForm from "@/features/trading/components/WatchlistForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { WatchlistItem } from "@/features/trading/types";

export default function Watchlist() {
  const { watchlistItems, loading, error, loadWatchlistItems } = useWatchlistStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadWatchlistItems();
  }, [loadWatchlistItems]);

  function handleAdd() {
    setSelectedItem(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(item: WatchlistItem) {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("watchlist.pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">{t("watchlist.pageDescription")}</p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("watchlist.addItem")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadWatchlistItems} />
      ) : loading && watchlistItems.length === 0 ? (
        <LoadingState label={t("watchlist.loading")} />
      ) : watchlistItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("watchlist.emptyState")}
        </div>
      ) : (
        <WatchlistTable items={watchlistItems} onEdit={handleEdit} />
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <WatchlistForm item={selectedItem} onDone={handleClose} />
      </Drawer>
    </div>
  );
}
