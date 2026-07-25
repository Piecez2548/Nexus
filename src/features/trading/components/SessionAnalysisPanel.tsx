import { useTradingAnalytics } from "@/features/trading/hooks/useTradingAnalytics";
import { SESSION_LABELS } from "@/features/trading/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";

export default function SessionAnalysisPanel() {
  const { sessionStats } = useTradingAnalytics();
  const sorted = [...sessionStats].sort((a, b) => b.totalPnl - a.totalPnl);
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-5 text-lg font-semibold">{t("trading.sessionAnalysis")}</h2>

      {sorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-zinc-600 dark:text-zinc-500">
          {t("trading.noSessionData")}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((stat) => (
            <div
              key={stat.session}
              className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
            >
              <div>
                <p className="font-medium">{SESSION_LABELS[stat.session]}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("trading.tradesN", { count: stat.tradeCount })} · {t("dashboard.winRate")} {stat.winRate.toFixed(0)}%
                </p>
              </div>

              <span className={`text-sm font-semibold ${stat.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {stat.totalPnl >= 0 ? "+" : ""}
                {stat.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
