import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { calculatePnl, calculateRR } from "@/features/trading/utils/pnl";
import { getMarketLabels, getDirectionLabels, getStatusLabels } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import MobileRowCard from "@/components/ui/MobileRowCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { Trade } from "@/features/trading/types";

interface Props {
  trades?: Trade[];
}

export default function TradeTable({ trades: propTrades }: Props) {
  const { trades: storeTrades, deleteTrade } = useTradeStore();
  const { openTradeDrawer } = useTradingUIStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const marketLabels = getMarketLabels(t);
  const directionLabels = getDirectionLabels(t);
  const statusLabels = getStatusLabels(t);

  const trades = propTrades ?? storeTrades;

  async function handleDelete(trade: Trade) {
    if (trade.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteTrade(trade.id);
      toast.success(t("trading.deleteSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  if (trades.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold">{t("trading.noTradesYet")}</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-500">{t("trading.emptyState")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {trades.map((trade) => {
          const pnl = calculatePnl(trade);
          const rr = calculateRR(trade);

          return (
            <MobileRowCard
              key={trade.id}
              title={trade.symbol}
              subtitle={marketLabels[trade.market]}
              trailing={
                <span
                  className={`text-base font-bold ${
                    pnl === null ? "text-zinc-600 dark:text-zinc-500" : pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pnl === null ? "-" : pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              }
              meta={
                <>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      trade.direction === "long"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {directionLabels[trade.direction]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      trade.status === "open"
                        ? "bg-brand-500/15 text-brand-400"
                        : "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {statusLabels[trade.status]}
                  </span>
                  {rr !== null && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{rr.toFixed(2)}R</span>
                  )}
                </>
              }
              actions={
                <>
                  <button
                    onClick={() => openTradeDrawer(trade)}
                    aria-label={t("common.editName", { name: trade.symbol })}
                    className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(trade)}
                    aria-label={t("common.deleteName", { name: trade.symbol })}
                    className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              }
            />
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950">
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              <th className="px-6 py-4 text-left">{t("trading.symbol")}</th>
              <th className="px-6 py-4 text-left">{t("trading.market")}</th>
              <th className="px-6 py-4 text-center">{t("trading.direction")}</th>
              <th className="px-6 py-4 text-right">{t("trading.entryPrice")}</th>
              <th className="px-6 py-4 text-right">{t("trading.exitPrice")}</th>
              <th className="px-6 py-4 text-right">{t("trading.pnl")}</th>
              <th className="px-6 py-4 text-right">{t("trading.rr")}</th>
              <th className="px-6 py-4 text-center">{t("common.status")}</th>
              <th className="px-6 py-4 text-center">{t("common.action")}</th>
            </tr>
          </thead>

          <tbody>
            {trades.map((trade) => {
              const pnl = calculatePnl(trade);
              const rr = calculateRR(trade);

              return (
                <tr
                  key={trade.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-6 py-4 font-medium">{trade.symbol}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{marketLabels[trade.market]}</td>

                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        trade.direction === "long"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {directionLabels[trade.direction]}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">{trade.entryPrice}</td>
                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">{trade.exitPrice ?? "-"}</td>

                  <td
                    className={`px-6 py-4 text-right font-bold ${
                      pnl === null ? "text-zinc-600 dark:text-zinc-500" : pnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pnl === null ? "-" : pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>

                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                    {rr === null ? "-" : `${rr.toFixed(2)}R`}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        trade.status === "open"
                          ? "bg-brand-500/15 text-brand-400"
                          : "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {statusLabels[trade.status]}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => openTradeDrawer(trade)}
                        aria-label={t("common.editName", { name: trade.symbol })}
                        className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(trade)}
                        aria-label={t("common.deleteName", { name: trade.symbol })}
                        className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
