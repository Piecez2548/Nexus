import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Dashboard from "./Dashboard";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { toLocalDateString } from "@/features/habits/utils/streak";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";

const now = new Date();
const thisMonth = (day: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth(), day));

describe("Dashboard (real data flow)", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useTransactionStore.setState({ transactions: [], loading: false });
    await db.todos.clear();
    useTodoStore.setState({ todos: [], loading: false, error: null });
    await db.habits.clear();
    useHabitStore.setState({ habits: [], loading: false, error: null });
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

  it("shows the AI Daily Summary panel as a real feature", async () => {
    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("AI Daily Summary")).toBeInTheDocument();
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
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

  it("no longer shows Quick Actions, Trading or Portfolio panels", async () => {
    render(<Dashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Budget")).toBeInTheDocument();
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Trading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Portfolio" })).not.toBeInTheDocument();
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

    // Exempt from the period selector — switching it
    // must not hide an activity that's genuinely happening right now.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByText("Deep work block")).toBeInTheDocument();
  });
});
