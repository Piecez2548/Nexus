import { useNavigate } from "react-router-dom";
import { LineChart } from "lucide-react";

import { useTradingStats } from "@/features/trading/hooks/useTradingStats";
import { useDashboardPeriodStore } from "@/features/dashboard/store/dashboardPeriodStore";
import { getDashboardPeriodRange } from "@/features/dashboard/utils/dashboardPeriodRange";
import { useTranslation } from "@/i18n/useTranslation";

const PERIOD_LABEL_KEYS = {
  day: "dashboard.periodDay",
  month: "dashboard.periodMonth",
  year: "dashboard.periodYear",
} as const;

function formatPnl(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TradingOverviewPanel() {
  const navigate = useNavigate();
  const { granularity } = useDashboardPeriodStore();
  const range = getDashboardPeriodRange(granularity);
  const { todayPnl, periodPnl, periodWinRate, openPositions } = useTradingStats(range);
  const { t } = useTranslation();

  const periodLabel = t(PERIOD_LABEL_KEYS[granularity]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("dashboard.trading")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.tradingOverviewDescription")}</p>
        </div>

        <LineChart size={20} className="text-zinc-500 dark:text-zinc-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.todaysPnl")}</p>
          <p className={`text-xl font-bold ${todayPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPnl(todayPnl)}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.periodPnl", { period: periodLabel })}</p>
          <p className={`text-xl font-bold ${(periodPnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPnl(periodPnl ?? 0)}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.winRate")}</p>
          <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300">{(periodWinRate ?? 0).toFixed(1)}%</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.openPositions")}</p>
          <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300">{openPositions}</p>
        </div>
      </div>

      <button
        onClick={() => navigate("/trading")}
        className="mt-5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("dashboard.viewTradingDashboard")}
      </button>
    </div>
  );
}
