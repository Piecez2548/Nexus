import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { calculateResult } from "@/features/trading/utils/pnl";
import TradeHistoryTable from "@/features/trading/components/TradeHistoryTable";
import TradingToolbar from "@/features/trading/components/TradingToolbar";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function TradingJournal() {
  const { trades, loading, error, loadTrades } = useTradeStore();
  const { openTradeDrawer } = useTradingUIStore();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [filterDirection, setFilterDirection] = useState("all");
  const [filterResult, setFilterResult] = useState("all");

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const query = search.toLowerCase();
      const matchSearch =
        query === "" ||
        trade.symbol.toLowerCase().includes(query) ||
        (trade.strategy ?? "").toLowerCase().includes(query);

      const matchDirection = filterDirection === "all" || trade.direction === filterDirection;

      const matchResult = filterResult === "all" || calculateResult(trade) === filterResult;

      return matchSearch && matchDirection && matchResult;
    });
  }, [trades, search, filterDirection, filterResult]);

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("trading.journalTitle")}</h1>

        <button
          onClick={() => openTradeDrawer()}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("trading.addTrade")}
        </button>
      </div>

      <TradingToolbar
        search={search}
        setSearch={setSearch}
        filterDirection={filterDirection}
        setFilterDirection={setFilterDirection}
        filterResult={filterResult}
        setFilterResult={setFilterResult}
        total={filteredTrades.length}
        exportTrades={filteredTrades}
      />

      {error ? (
        <ErrorState message={error} onRetry={loadTrades} />
      ) : loading && trades.length === 0 ? (
        <LoadingState label={t("trading.loadingTrades")} />
      ) : (
        <TradeHistoryTable trades={filteredTrades} />
      )}

    </div>
  );
}
