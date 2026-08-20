import { Search, RotateCcw, Filter, FileDown } from "lucide-react";

import { tradesToCsv } from "@/features/trading/utils/tradeCsv";
import { downloadFile } from "@/utils/download";
import { getDirectionLabels, getResultLabels } from "@/features/trading/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";
import { toLocalDateString } from "@/utils/localDate";
import type { Trade } from "@/features/trading/types";

interface Props {
  search: string;
  setSearch: (value: string) => void;

  filterDirection: string;
  setFilterDirection: (value: string) => void;

  filterResult: string;
  setFilterResult: (value: string) => void;

  total: number;
  exportTrades: Trade[];
}

function handleExport(trades: Trade[]) {
  const csv = tradesToCsv(trades);
  // toLocalDateString, not toISOString().slice(0,10) (UTC) -- the exported
  // file's data already uses local dates throughout (tradeCsv.ts); the
  // filename should match, not read as tomorrow/yesterday near midnight.
  downloadFile(`nexus-trades-${toLocalDateString(new Date())}.csv`, csv, "text/csv;charset=utf-8;");
}

export default function TradingToolbar({
  search,
  setSearch,
  filterDirection,
  setFilterDirection,
  filterResult,
  setFilterResult,
  total,
  exportTrades,
}: Props) {
  const { t } = useTranslation();
  const directionLabels = getDirectionLabels(t);
  const resultLabels = getResultLabels(t);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("trading.filters")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-500">{t("trading.tradesCount", { count: total })}</p>
        </div>

        <Filter size={20} className="text-zinc-600 dark:text-zinc-500" />
      </div>

      <div className="flex flex-wrap gap-4">

        <div className="relative min-w-[260px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("trading.searchPlaceholder")}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-3 pl-10 pr-4 outline-none transition focus:border-brand-500"
          />
        </div>

        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 outline-none transition focus:border-brand-500"
        >
          <option value="all">{t("trading.allDirections")}</option>
          {Object.entries(directionLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 outline-none transition focus:border-brand-500"
        >
          <option value="all">{t("trading.allResults")}</option>
          <option value="open">{resultLabels.open}</option>
          <option value="win">{resultLabels.win}</option>
          <option value="loss">{resultLabels.loss}</option>
          {/* calculateResult() can return "unknown" for a closed trade with
              no exit price recorded (only reachable via imported/legacy
              data -- the form itself can't produce that state) -- without
              this option such a trade could only ever be found under "All
              Results", never isolated on its own. */}
          <option value="unknown">{t("trading.filterUnknownResult")}</option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setFilterDirection("all");
            setFilterResult("all");
          }}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <RotateCcw size={16} />
          {t("common.reset")}
        </button>

        <button
          onClick={() => handleExport(exportTrades)}
          disabled={exportTrades.length === 0}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
        >
          <FileDown size={16} />
          {t("trading.exportCsv")}
        </button>

      </div>

    </div>
  );
}
