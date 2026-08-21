import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ExecutiveDashboard from "./ExecutiveDashboard";
import { db } from "@/database/db";
import { toLocalDateString } from "@/utils/localDate";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import type { NetWorthItem } from "@/features/finance/types";

const now = new Date();
const daysAgo = (n: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));

async function resetAll() {
  await Promise.all([
    db.todos.clear(),
    db.habits.clear(),
    db.scheduleItems.clear(),
    db.goals.clear(),
    db.goalMilestoneEvents.clear(),
    db.workoutEntries.clear(),
    db.budgets.clear(),
    db.transactions.clear(),
    db.netWorthItems.clear(),
    db.trades.clear(),
  ]);

  useTodoStore.setState({ todos: [], loading: false, error: null });
  useHabitStore.setState({ habits: [], loading: false, error: null });
  useScheduleItemStore.setState({ items: [], loading: false, error: null });
  useGoalStore.setState({ goals: [], loading: false, error: null });
  useGoalMilestoneEventStore.setState({ events: [], loading: false, error: null });
  useWorkoutEntryStore.setState({ entries: [], loading: false, error: null });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useTransactionStore.setState({ transactions: [], loading: false });
  useNetWorthItemStore.setState({ items: [], loading: false, error: null });
  useTradeStore.setState({ trades: [], loading: false, error: null });
}

describe("ExecutiveDashboard (real data flow)", () => {
  beforeEach(async () => {
    await resetAll();
  });

  it("shows a light workload and empty states with no data anywhere (empty system)", async () => {
    render(<ExecutiveDashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Nothing urgent right now")).toBeInTheDocument();
    expect(screen.getByText("Nothing overdue")).toBeInTheDocument();
    expect(screen.getByText("No goals yet")).toBeInTheDocument();
    expect(screen.getByText("Nothing urgent today")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("surfaces an overdue todo in both the Overdue section and the Priority list", async () => {
    await db.todos.add({ title: "Submit report", dueDate: daysAgo(2), priority: "high", completed: false, createdAt: "2026-01-01" });

    render(<ExecutiveDashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("1 item(s) overdue")).toBeInTheDocument();
    expect(screen.getAllByText("Submit report").length).toBeGreaterThan(0);
  });

  it("shows a goal past its deadline as at-risk in both the Goals snapshot and the summary", async () => {
    await db.goals.add({ name: "Emergency fund", targetAmount: 10000, currentAmount: 2000, deadline: daysAgo(5) });

    render(<ExecutiveDashboard />, { wrapper: MemoryRouter });

    expect((await screen.findAllByText("Emergency fund")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 goal(s) past deadline")).toBeInTheDocument();
    expect(screen.getByText("1 goal(s) at risk")).toBeInTheDocument();
  });

  it("reflects real budget and net worth data in the Finance snapshot", async () => {
    await db.netWorthItems.bulkAdd([
      { name: "Savings", kind: "asset", category: "bank", value: 50000, icon: "wallet", color: "#16a34a", createdAt: "2026-01-01" },
      { name: "Credit card", kind: "liability", category: "creditCard", value: 5000, icon: "credit-card", color: "#dc2626", createdAt: "2026-01-01" },
    ] satisfies NetWorthItem[]);

    render(<ExecutiveDashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("฿45,000")).toBeInTheDocument(); // 50000 - 5000
  });

  it("navigation link to Todo works from the Overdue section", async () => {
    await db.todos.add({ title: "Overdue item", dueDate: daysAgo(1), priority: "medium", completed: false, createdAt: "2026-01-01" });

    render(<ExecutiveDashboard />, { wrapper: MemoryRouter });

    await screen.findAllByText("Overdue item");
    const links = screen.getAllByRole("link", { name: /View all/i });
    const todoLink = links.find((l) => l.getAttribute("href") === "/todo");
    expect(todoLink).toBeDefined();
  });
});
