import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import FinanceDashboard from "./FinanceDashboard";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";

function renderPage() {
  return render(<FinanceDashboard />, { wrapper: MemoryRouter });
}

describe("FinanceDashboard page", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.goals.clear();

    useTransactionStore.setState({ transactions: [], loading: false, error: null });
    useBudgetStore.setState({ budgets: [], loading: false, error: null });
    useGoalStore.setState({ goals: [], loading: false, error: null });
  });

  it("renders empty states with no data", async () => {
    renderPage();

    expect(await screen.findByText("Finance Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("No recurring items yet")).toBeInTheDocument();
    expect(await screen.findByText("No budgets yet")).toBeInTheDocument();
    expect(await screen.findByText("No saving goals yet")).toBeInTheDocument();
  });

  it("shows the monthly summary, subscriptions, budget, and goals with real data", async () => {
    await db.transactions.bulkAdd([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      {
        title: "Netflix",
        amount: 419,
        type: "expense",
        category: "Entertainment",
        account: "Cash",
        date: "2026-07-05",
        status: "completed",
        recurring: { frequency: "monthly" },
      },
    ]);
    await db.budgets.add({ category: "Entertainment", amount: 1000, period: "monthly" });
    await db.goals.add({ name: "Emergency Fund", targetAmount: 10000, currentAmount: 2000 });

    renderPage();

    expect(await screen.findByText("Monthly Summary")).toBeInTheDocument();
    // "Netflix" appears in both the Recent Transactions row and the
    // Subscriptions panel; "Entertainment" additionally in the pie chart
    // legend and the category breakdown table.
    expect(screen.getAllByText("Netflix").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Entertainment").length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText("Emergency Fund")).toBeInTheDocument();
  });
});
