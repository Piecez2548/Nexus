import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { DIRECTION_LABELS } from "@/features/trading/constants/labels";

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  path: string;
}

const MAX_RESULTS_PER_GROUP = 5;

export function useGlobalSearch(query: string): SearchResult[] {
  const { transactions } = useTransactionStore();
  const { trades } = useTradeStore();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [];

    const transactionResults: SearchResult[] = transactions
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((t) => ({
        id: `transaction-${t.id}`,
        label: t.title,
        sublabel: `${t.type === "expense" ? "-" : "+"}฿${t.amount.toLocaleString()} · ${t.date}`,
        path: "/transactions",
      }));

    const tradeResults: SearchResult[] = trades
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          (t.strategy ?? "").toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((t) => ({
        id: `trade-${t.id}`,
        label: t.symbol,
        sublabel: `${DIRECTION_LABELS[t.direction]} · ${t.entryDate}`,
        path: "/trading/journal",
      }));

    return [...transactionResults, ...tradeResults];
  }, [query, transactions, trades]);
}
