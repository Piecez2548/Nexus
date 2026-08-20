import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import { useTradingAnalytics, type StrategyComparisonRow } from "@/features/trading/hooks/useTradingAnalytics";
import MobileRowCard from "@/components/ui/MobileRowCard";
import { useTranslation } from "@/i18n/useTranslation";

type SortKey = "strategy" | "tradeCount" | "winRate" | "totalPnl" | "profitFactor" | "averageRR";

function formatProfitFactor(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(2);
}

export default function StrategyComparisonTable() {
  const { strategyComparison } = useTradingAnalytics();
  const [sortKey, setSortKey] = useState<SortKey>("totalPnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { t } = useTranslation();

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    return [...strategyComparison].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (Number(av) - Number(bv)) * dir;
    });
  }, [strategyComparison, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({
    label,
    sortKeyName,
    align = "left",
  }: {
    label: string;
    sortKeyName: SortKey;
    align?: "left" | "right" | "center";
  }) {
    const alignClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    const Icon = sortKey !== sortKeyName ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;

    return (
      <th className={`px-4 py-4 text-${align}`}>
        <button
          type="button"
          onClick={() => toggleSort(sortKeyName)}
          className={`flex w-full items-center gap-1 ${alignClass} transition hover:text-brand-500`}
        >
          {label}
          <Icon size={13} />
        </button>
      </th>
    );
  }

  if (strategyComparison.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("trading.strategyComparison")}</h2>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("trading.noClosedTrades")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t("trading.strategyComparison")}</h2>

      <div className="space-y-3 md:hidden">
        {sortedRows.map((row) => (
          <MobileRowCard
            key={row.strategy}
            title={row.strategy}
            subtitle={t("trading.tradesN", { count: row.tradeCount })}
            trailing={
              <span className={`text-base font-bold ${row.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {row.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            }
            meta={
              <>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("dashboard.winRate")}: {row.winRate.toFixed(1)}%
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("trading.profitFactor")}: {formatProfitFactor(row.profitFactor)}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.averageRR.toFixed(2)}R</span>
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
                <SortHeader label={t("trading.strategyLabel")} sortKeyName="strategy" />
                <SortHeader label={t("trading.tradeCount")} sortKeyName="tradeCount" align="right" />
                <SortHeader label={t("dashboard.winRate")} sortKeyName="winRate" align="right" />
                <SortHeader label={t("trading.totalPnl")} sortKeyName="totalPnl" align="right" />
                <SortHeader label={t("trading.profitFactor")} sortKeyName="profitFactor" align="right" />
                <SortHeader label={t("trading.averageRr")} sortKeyName="averageRR" align="right" />
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row: StrategyComparisonRow) => (
                <tr
                  key={row.strategy}
                  className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-4 font-medium">{row.strategy}</td>
                  <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{row.tradeCount}</td>
                  <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{row.winRate.toFixed(1)}%</td>
                  <td
                    className={`px-4 py-4 text-right font-bold ${row.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {row.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">
                    {formatProfitFactor(row.profitFactor)}
                  </td>
                  <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{row.averageRR.toFixed(2)}R</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
