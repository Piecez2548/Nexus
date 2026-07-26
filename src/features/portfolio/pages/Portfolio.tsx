import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { usePortfolioStats } from "@/features/portfolio/hooks/usePortfolioStats";
import HoldingCard from "@/features/portfolio/components/HoldingCard";
import HoldingForm from "@/features/portfolio/components/HoldingForm";
import PortfolioSummaryGrid from "@/features/portfolio/components/PortfolioSummaryGrid";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Holding } from "@/features/portfolio/types";

export default function Portfolio() {
  const { holdings, loading, error, loadHoldings } = useHoldingStore();
  const stats = usePortfolioStats();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  function handleAdd() {
    setSelectedHolding(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(holding: Holding) {
    setSelectedHolding(holding);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedHolding(null);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("portfolio.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          {t("portfolio.addHolding")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadHoldings} />
      ) : loading && holdings.length === 0 ? (
        <LoadingState label={t("portfolio.loading")} />
      ) : holdings.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("portfolio.emptyState")}
        </div>
      ) : (
        <>
          <PortfolioSummaryGrid {...stats} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {holdings.map((holding) => (
              <HoldingCard key={holding.id} holding={holding} onEdit={() => handleEdit(holding)} />
            ))}
          </div>
        </>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <HoldingForm holding={selectedHolding} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
