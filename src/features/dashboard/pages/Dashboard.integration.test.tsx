import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Dashboard from "./Dashboard";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { toLocalDateString } from "@/features/habits/utils/streak";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";

const now = new Date();
const thisMonth = (day: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth(), day));

describe("Dashboard (real data flow)", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useTransactionStore.setState({ transactions: [], loading: false });
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
    await db.todos.clear();
    useTodoStore.setState({ todos: [], loading: false, error: null });
    await db.habits.clear();
    useHabitStore.setState({ habits: [], loading: false, error: null });
    await db.holdings.clear();
    useHoldingStore.setState({ holdings: [], loading: false, error: null });
    await db.scheduleItems.clear();
    useScheduleItemStore.setState({ items: [], loading: false, error: null });
  });

  it("shows an empty state with no transactions", async () => {
    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findAllByText("No expense data yet")).toHaveLength(1);
    expect(screen.getAllByText("฿0")).toHaveLength(4);
  });

  it("reflects real transaction data in summary cards, recent list, and charts", async () => {
    await db.transactions.bulkAdd([
      { title: "Salary", amount: 30000, type: "income", category: "Paycheck", account: "Bank", date: thisMonth(1), status: "completed" },
      { title: "Groceries", amount: 2000, type: "expense", category: "Food", account: "Cash", date: thisMonth(2), status: "completed" },
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

  it("shows the AI Daily Summary panel with real data and a real-data trading overview", async () => {
    const today = toLocalDateString(new Date());

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

    // The AI Daily Summary panel is a real feature now, not a placeholder.
    expect(await screen.findByText("AI Daily Summary")).toBeInTheDocument();
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();

    // Trading overview reflects the real trade data: the AAPL trade closed
    // today falls within both "today" and the default "month" period window,
    // so "+200" appears twice (Today's P/L and the period P/L card).
    expect(await screen.findAllByText("+200")).toHaveLength(2);
    expect(screen.getByText("100.0%")).toBeInTheDocument(); // win rate
    expect(screen.getByText("1")).toBeInTheDocument(); // open positions
  });

  it("shows the AI Daily Summary panel's empty state with no activity today", async () => {
    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("AI Daily Summary")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nothing logged yet today — add a transaction, check off a habit, or start a task to see it here."
      )
    ).toBeInTheDocument();
  });

  it("reflects today's activity in the AI Daily Summary panel's highlights", async () => {
    const today = toLocalDateString(new Date());

    await db.transactions.add({
      title: "Coffee",
      amount: 80,
      type: "expense",
      account: "Cash",
      date: today,
      status: "completed",
    });

    await db.todos.add({
      title: "Finish report",
      priority: "medium",
      completed: true,
      completedAt: new Date().toISOString(),
      createdAt: "2026-07-20T00:00:00.000Z",
    });

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("You've spent ฿80 today")).toBeInTheDocument();
    expect(screen.getByText("1 tasks completed today")).toBeInTheDocument();
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

  it("shows habits in the Habit Tracker preview panel and lets you check one in", async () => {
    await db.habits.add({
      name: "ออกกำลังกาย",
      frequency: "daily",
      completedDates: [],
      createdAt: "2026-07-20T00:00:00.000Z",
    } as never);

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("ออกกำลังกาย")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /mark ออกกำลังกาย done for today/i }));

    await waitFor(async () => {
      const stored = await db.habits.toArray();
      const today = toLocalDateString(new Date());
      expect(stored[0].completedDates).toContain(today);
    });
  });

  it("no longer shows Quick Actions, and switching the period selector doesn't affect the exempt Portfolio panel", async () => {
    await db.holdings.bulkAdd([
      { symbol: "AAPL", market: "stocks", quantity: 10, avgCostPrice: 100, currentPrice: 120, createdAt: "2026-07-20T00:00:00.000Z" },
    ] as never[]);

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Budget")).toBeInTheDocument();
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();

    const portfolioPnlBefore = screen.getAllByText("+200 (+20%)").length;
    expect(portfolioPnlBefore).toBeGreaterThan(0);

    // Switching the period must not change Portfolio — confirmed exempt.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getAllByText("+200 (+20%)")).toHaveLength(portfolioPnlBefore);

    await user.click(screen.getByRole("button", { name: "Year" }));
    expect(screen.getAllByText("+200 (+20%)")).toHaveLength(portfolioPnlBefore);
  });

  it("reflects real holdings data in the Portfolio overview panel", async () => {
    await db.holdings.bulkAdd([
      {
        symbol: "AAPL",
        market: "stocks",
        quantity: 10,
        avgCostPrice: 100,
        currentPrice: 120,
        createdAt: "2026-07-20T00:00:00.000Z",
      },
      {
        symbol: "BTC",
        market: "crypto",
        quantity: 1,
        avgCostPrice: 50000,
        createdAt: "2026-07-20T00:00:00.000Z",
      },
    ] as never[]);

    render(<Dashboard />, { wrapper: MemoryRouter });

    // 2 holdings, only 1 priced -> a partial-sum caveat and a real P/L from
    // the priced holding alone (the unpriced BTC contributes 0 to the total).
    expect(await screen.findByText("51,000")).toBeInTheDocument(); // total cost basis
    expect(screen.getByText("+200 (+20%)")).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 priced/i)).toBeInTheDocument();
  });

  it("shows the current activity in the Life Schedule preview panel, regardless of the period selector", async () => {
    // Spans virtually the entire day so it's "current" no matter what time
    // this test actually runs at, without needing to fake the system clock.
    await db.scheduleItems.add({
      title: "Deep work block",
      icon: "briefcase",
      color: "#3b82f6",
      startTime: "00:00",
      endTime: "23:59",
      repeat: { frequency: "daily" },
      enabled: true,
      createdAt: "2026-07-20T00:00:00.000Z",
    } as never);

    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Deep work block")).toBeInTheDocument();

    // Exempt from the period selector, same as Portfolio — switching it
    // must not hide an activity that's genuinely happening right now.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByText("Deep work block")).toBeInTheDocument();
  });
});
