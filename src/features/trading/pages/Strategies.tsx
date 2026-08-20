import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useStrategyStore } from "@/features/trading/store/strategyStore";
import StrategyCard from "@/features/trading/components/StrategyCard";
import StrategyForm from "@/features/trading/components/StrategyForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Strategy } from "@/features/trading/types";

export default function Strategies() {
  const { strategies, loading, error, loadStrategies } = useStrategyStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  function handleAdd() {
    setSelectedStrategy(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(strategy: Strategy) {
    setSelectedStrategy(strategy);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedStrategy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("strategies.pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">{t("strategies.pageDescription")}</p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("strategies.addStrategy")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadStrategies} />
      ) : loading && strategies.length === 0 ? (
        <LoadingState label={t("strategies.loading")} />
      ) : strategies.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("strategies.emptyState")}
        </div>
      ) : (
        <StrategyCard strategies={strategies} onEdit={handleEdit} />
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <StrategyForm strategy={selectedStrategy} onDone={handleClose} />
      </Drawer>
    </div>
  );
}
