import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";

import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { usePortfolioStats } from "@/features/portfolio/hooks/usePortfolioStats";
import { useTranslation } from "@/i18n/useTranslation";

function formatMoney(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function PortfolioOverviewPanel() {
  const navigate = useNavigate();
  const { loadHoldings } = useHoldingStore();
  const stats = usePortfolioStats();
  const { t } = useTranslation();

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  const isPartial = stats.pricedHoldingsCount > 0 && stats.pricedHoldingsCount < stats.holdingsCount;
  const pnlValue =
    stats.totalUnrealizedPnl === null
      ? t("portfolio.noPriceYetShort")
      : `${formatMoney(stats.totalUnrealizedPnl)} (${formatMoney(stats.totalUnrealizedPnlPercent ?? 0)}%)`;
  const pnlColor =
    stats.totalUnrealizedPnl === null ? "" : stats.totalUnrealizedPnl >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("nav.portfolio")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.portfolioOverviewDescription")}</p>
        </div>

        <Briefcase size={20} className="text-zinc-500 dark:text-zinc-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("portfolio.holdingsCount")}</p>
          <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300">{stats.holdingsCount}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("portfolio.totalCostBasis")}</p>
          <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
            {stats.totalCostBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("portfolio.totalCurrentValue")}</p>
          <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
            {stats.totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("portfolio.totalUnrealizedPnl")}
            {isPartial && ` (${t("portfolio.pricedOfTotal", { priced: stats.pricedHoldingsCount, total: stats.holdingsCount })})`}
          </p>
          <p className={`text-xl font-bold ${pnlColor || "text-zinc-700 dark:text-zinc-300"}`}>{pnlValue}</p>
        </div>
      </div>

      <button
        onClick={() => navigate("/trading/portfolio")}
        className="mt-5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("dashboard.viewPortfolio")}
      </button>
    </div>
  );
}
