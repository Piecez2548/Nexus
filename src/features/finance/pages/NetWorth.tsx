import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import { useNetWorthSnapshotStore } from "@/features/finance/store/netWorthSnapshotStore";
import { useNetWorthStats } from "@/features/finance/hooks/useNetWorthStats";
import NetWorthSummaryGrid from "@/features/finance/components/NetWorthSummaryGrid";
import NetWorthHistoryChart from "@/features/finance/components/NetWorthHistoryChart";
import NetWorthItemSection from "@/features/finance/components/NetWorthItemSection";
import NetWorthItemForm from "@/features/finance/components/NetWorthItemForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { NetWorthItem } from "@/features/finance/types";

export default function NetWorth() {
  const { items, loading, error, loadItems } = useNetWorthItemStore();
  const { snapshots, loadSnapshots } = useNetWorthSnapshotStore();
  const stats = useNetWorthStats();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NetWorthItem | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadItems();
    loadSnapshots();
  }, [loadItems, loadSnapshots]);

  function handleAdd() {
    setSelectedItem(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(item: NetWorthItem) {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  }

  const assets = items.filter((i) => i.kind === "asset");
  const liabilities = items.filter((i) => i.kind === "liability");

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("netWorth.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("netWorth.addItem")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadItems} />
      ) : loading && items.length === 0 ? (
        <LoadingState label={t("netWorth.loading")} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("netWorth.emptyState")}
        </div>
      ) : (
        <>
          <NetWorthSummaryGrid {...stats} />

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <NetWorthHistoryChart snapshots={snapshots} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <NetWorthItemSection
              title={t("netWorth.assets")}
              emptyLabel={t("netWorth.noAssets")}
              items={assets}
              total={stats.totalAssets}
              onEdit={handleEdit}
            />

            <NetWorthItemSection
              title={t("netWorth.liabilities")}
              emptyLabel={t("netWorth.noLiabilities")}
              items={liabilities}
              total={stats.totalLiabilities}
              onEdit={handleEdit}
            />
          </div>
        </>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <NetWorthItemForm item={selectedItem} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
