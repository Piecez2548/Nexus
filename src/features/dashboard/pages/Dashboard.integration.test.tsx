import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Dashboard from "./Dashboard";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";

describe("Dashboard (real data flow)", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useTransactionStore.setState({ transactions: [], loading: false });
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
    await db.todos.clear();
    useTodoStore.setState({ todos: [], loading: false, error: null });
  });

  it("shows an empty state with no transactions", async () => {
    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findAllByText("No expense data yet")).toHaveLength(2);
    expect(screen.getAllByText("฿0")).toHaveLength(4);
  });

  it("reflects real transaction data in summary cards, recent list, and charts", async () => {
    await db.transactions.bulkAdd([
      { title: "Salary", amount: 30000, type: "income", category: "Paycheck", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Groceries", amount: 2000, type: "expense", category: "Food", account: "Cash", date: "2026-07-02", status: "completed" },
    ]);

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    // Amounts appear once in the summary cards and once in the recent-transactions row.
    expect(screen.getAllByText("฿30,000")).toHaveLength(2);
    expect(screen.getAllByText("฿28,000")).toHaveLength(2);

    // "฿2,000" appears a third time as the pie chart's centered total (the
    // only expense category, so the category total equals the grand total).
    expect(screen.getAllByText("฿2,000")).toHaveLength(3);

    // Pie chart and category breakdown should no longer show the empty state.
    expect(screen.queryByText("No expense data yet")).not.toBeInTheDocument();
  });

  it("shows the Life Modules placeholders and a real-data trading overview", async () => {
    const today = new Date().toISOString().slice(0, 10);

    await db.trades.bulkAdd([
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 120,
        quantity: 10,
        entryDate: today,
        exitDate: today,
      },
      {
        symbol: "MSFT",
        market: "stocks",
        direction: "long",
        status: "open",
        entryPrice: 300,
        quantity: 5,
        entryDate: today,
      },
    ]);

    render(<Dashboard />, { wrapper: MemoryRouter });

    // Four "coming soon" placeholder modules (Todo and Notifications are
    // real, working features now, so they're not among these).
    expect(await screen.findByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("AI Daily Summary")).toBeInTheDocument();
    expect(screen.getAllByText("Coming Soon")).toHaveLength(4);

    // Trading overview reflects the real trade data: the AAPL trade closed
    // today falls within both the "today" and "monthly" P/L windows, so
    // "+200" appears twice (Today's P/L and Monthly P/L).
    expect(await screen.findAllByText("+200")).toHaveLength(2);
    expect(screen.getByText("100.0%")).toBeInTheDocument(); // win rate
    expect(screen.getByText("1")).toBeInTheDocument(); // open positions
  });

  it("shows pending todos in the Todo preview panel and lets you mark one done", async () => {
    await db.todos.bulkAdd([
      { title: "ส่งรายงาน", priority: "high", completed: false, createdAt: "2026-07-20T00:00:00.000Z" },
      { title: "ซื้อของ", priority: "low", completed: true, createdAt: "2026-07-19T00:00:00.000Z", completedAt: "2026-07-19T00:00:00.000Z" },
    ]);

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("ส่งรายงาน")).toBeInTheDocument();
    // Completed todos don't show in the pending preview list.
    expect(screen.queryByText("ซื้อของ")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mark ส่งรายงาน as done" }));

    await screen.findByText("Nothing to do right now");
    const stored = await db.todos.toArray();
    expect(stored.find((t) => t.title === "ส่งรายงาน")?.completed).toBe(true);
  });
});
