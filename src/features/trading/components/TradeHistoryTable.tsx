import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Image, PlayCircle } from "lucide-react";

import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { calculatePnl, calculateRR, calculateResult } from "@/features/trading/utils/pnl";
import { getDirectionLabels, getEmotionLabels, getResultLabels } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import MobileRowCard from "@/components/ui/MobileRowCard";
import Drawer from "@/components/ui/Drawer";
import TradeReplayView from "@/features/trading/components/TradeReplayView";
import { useTranslation } from "@/i18n/useTranslation";
import type { Trade } from "@/features/trading/types";

interface Props {
  trades: Trade[];
}

type SortKey = "entryDate" | "symbol" | "quantity" | "entryPrice" | "exitPrice" | "pnl" | "rr" | "strategy";

const PAGE_SIZE = 10;

const RESULT_BADGE_CLASS: Record<string, string> = {
  open: "bg-brand-500/15 text-brand-400",
  win: "bg-green-500/15 text-green-400",
  loss: "bg-red-500/15 text-red-400",
  unknown: "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300",
};

interface Row {
  trade: Trade;
  pnl: number | null;
  rr: number | null;
  result: ReturnType<typeof calculateResult>;
}

function compareValues(a: number | string | null, b: number | string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function TradeHistoryTable({ trades }: Props) {
  const { deleteTrade } = useTradeStore();
  const { openTradeDrawer } = useTradingUIStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [replayTrade, setReplayTrade] = useState<Trade | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("entryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const toast = useToast();
  const { t } = useTranslation();
  const directionLabels = getDirectionLabels(t);
  const emotionLabels = getEmotionLabels(t);
  const resultLabels = getResultLabels(t);

  const rows: Row[] = useMemo(
    () =>
      trades.map((trade) => ({
        trade,
        pnl: calculatePnl(trade),
        rr: calculateRR(trade),
        result: calculateResult(trade),
      })),
    [trades]
  );

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const value = (row: Row): number | string | null => {
        switch (sortKey) {
          case "entryDate":
            return row.trade.entryDate;
          case "symbol":
            return row.trade.symbol;
          case "quantity":
            return row.trade.quantity;
          case "entryPrice":
            return row.trade.entryPrice;
          case "exitPrice":
            return row.trade.exitPrice ?? null;
          case "pnl":
            return row.pnl;
          case "rr":
            return row.rr;
          case "strategy":
            return row.trade.strategy ?? null;
        }
      };

      return compareValues(value(a), value(b)) * dir;
    });
  }, [rows, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [trades]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  function SortHeader({ label, sortKeyName, align = "left" }: { label: string; sortKeyName: SortKey; align?: "left" | "right" | "center" }) {
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

  if (trades.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold">{t("trading.noTradesFound")}</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-500">{t("trading.tryAdjustingFilters")}</p>
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
        {pageRows.map(({ trade, pnl, rr, result }) => (
          <MobileRowCard
            key={trade.id}
            title={trade.symbol}
            subtitle={`${trade.entryDate}${trade.strategy ? ` · ${trade.strategy}` : ""}`}
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
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RESULT_BADGE_CLASS[result]}`}>
                  {resultLabels[result]}
                </span>
                {rr !== null && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{rr.toFixed(2)}R</span>
                )}
                {trade.screenshots && trade.screenshots.length > 0 && (
                  <a
                    href={trade.screenshots[0]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("trading.viewScreenshot", { symbol: trade.symbol })}
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    <Image size={13} />
                    {trade.screenshots.length > 1 && trade.screenshots.length}
                  </a>
                )}
              </>
            }
            actions={
              <>
                <button
                  onClick={() => setReplayTrade(trade)}
                  aria-label={t("trading.viewReplay", { symbol: trade.symbol })}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <PlayCircle size={16} />
                </button>

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
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950">
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              <SortHeader label={t("common.date")} sortKeyName="entryDate" />
              <SortHeader label={t("trading.symbol")} sortKeyName="symbol" />
              <th className="px-4 py-4 text-center">{t("trading.direction")}</th>
              <SortHeader label={t("trading.lot")} sortKeyName="quantity" align="right" />
              <SortHeader label={t("trading.entryPrice")} sortKeyName="entryPrice" align="right" />
              <SortHeader label={t("trading.exitPrice")} sortKeyName="exitPrice" align="right" />
              <SortHeader label={t("trading.pnl")} sortKeyName="pnl" align="right" />
              <th className="px-4 py-4 text-right">{t("trading.riskPercent")}</th>
              <SortHeader label={t("trading.rr")} sortKeyName="rr" align="right" />
              <SortHeader label={t("trading.strategyLabel")} sortKeyName="strategy" />
              <th className="px-4 py-4 text-center">{t("trading.emotion")}</th>
              <th className="px-4 py-4 text-center">{t("trading.screenshotLabel")}</th>
              <th className="px-4 py-4 text-center">{t("trading.result")}</th>
              <th className="px-4 py-4 text-center">{t("common.action")}</th>
            </tr>
          </thead>

          <tbody>
            {pageRows.map(({ trade, pnl, rr, result }) => (
              <tr
                key={trade.id}
                className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{trade.entryDate}</td>
                <td className="px-4 py-4 font-medium">{trade.symbol}</td>

                <td className="px-4 py-4 text-center">
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

                <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{trade.quantity}</td>
                <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{trade.entryPrice}</td>
                <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">{trade.exitPrice ?? "-"}</td>

                <td
                  className={`px-4 py-4 text-right font-bold ${
                    pnl === null ? "text-zinc-600 dark:text-zinc-500" : pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pnl === null ? "-" : pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>

                <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  {trade.riskPercent !== undefined ? `${trade.riskPercent}%` : "-"}
                </td>

                <td className="px-4 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  {rr === null ? "-" : `${rr.toFixed(2)}R`}
                </td>

                <td className="px-4 py-4 text-zinc-700 dark:text-zinc-300">{trade.strategy ?? "-"}</td>

                <td className="px-4 py-4 text-center text-zinc-700 dark:text-zinc-300">
                  {trade.emotionBefore ? emotionLabels[trade.emotionBefore] : "-"}
                </td>

                <td className="px-4 py-4 text-center">
                  {trade.screenshots && trade.screenshots.length > 0 ? (
                    <a
                      href={trade.screenshots[0]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("trading.viewScreenshot", { symbol: trade.symbol })}
                      className="inline-flex items-center gap-1 rounded-lg p-2 text-zinc-500 transition hover:bg-brand-600/20 hover:text-brand-400"
                    >
                      <Image size={16} />
                      {trade.screenshots.length > 1 && (
                        <span className="text-xs">{trade.screenshots.length}</span>
                      )}
                    </a>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">-</span>
                  )}
                </td>

                <td className="px-4 py-4 text-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RESULT_BADGE_CLASS[result]}`}>
                    {resultLabels[result]}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setReplayTrade(trade)}
                      aria-label={t("trading.viewReplay", { symbol: trade.symbol })}
                      className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                    >
                      <PlayCircle size={18} />
                    </button>

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
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {t("trading.page", { current: currentPage, total: totalPages, count: sortedRows.length })}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            {t("common.prev")}
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 md:hidden">
        <span>
          {t("trading.pageShort", { current: currentPage, total: totalPages, count: sortedRows.length })}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            {t("common.prev")}
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      <Drawer open={replayTrade !== null} onClose={() => setReplayTrade(null)}>
        {replayTrade && <TradeReplayView trade={replayTrade} />}
      </Drawer>
    </div>
  );
}
