import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useGlobalSearch } from "./useGlobalSearch";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import type { Transaction } from "@/features/finance/types";
import type { Trade } from "@/features/trading/types";

describe("useGlobalSearch", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
    useTradeStore.setState({ trades: [] });
  });

  it("returns nothing for an empty query", () => {
    const { result } = renderHook(() => useGlobalSearch(""));
    expect(result.current).toEqual([]);
  });

  it("matches transactions by title, case-insensitively", () => {
    const transactions: Transaction[] = [
      { id: 1, title: "Starbucks Coffee", amount: 120, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { id: 2, title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01", status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    const { result } = renderHook(() => useGlobalSearch("starbucks"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Starbucks Coffee", path: "/transactions" });
  });

  it("matches trades by symbol or strategy", () => {
    const trades: Trade[] = [
      { id: 1, symbol: "AAPL", market: "stocks", direction: "long", status: "open", entryPrice: 100, quantity: 10, entryDate: "2026-07-20", strategy: "Breakout" },
      { id: 2, symbol: "MSFT", market: "stocks", direction: "long", status: "open", entryPrice: 300, quantity: 5, entryDate: "2026-07-21" },
    ];
    useTradeStore.setState({ trades });

    expect(renderHook(() => useGlobalSearch("aapl")).result.current).toHaveLength(1);
    expect(renderHook(() => useGlobalSearch("breakout")).result.current).toHaveLength(1);
    expect(renderHook(() => useGlobalSearch("msft")).result.current[0]).toMatchObject({
      label: "MSFT",
      path: "/trading/journal",
    });
  });

  it("combines results from both transactions and trades", () => {
    useTransactionStore.setState({
      transactions: [
        { id: 1, title: "AAPL dividend", amount: 50, type: "income", account: "Bank", date: "2026-07-20", status: "completed" },
      ],
    });
    useTradeStore.setState({
      trades: [
        { id: 1, symbol: "AAPL", market: "stocks", direction: "long", status: "open", entryPrice: 100, quantity: 10, entryDate: "2026-07-20" },
      ],
    });

    const { result } = renderHook(() => useGlobalSearch("aapl"));
    expect(result.current).toHaveLength(2);
  });
});
