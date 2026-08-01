import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Budget from "./Budget";
import { db } from "@/database/db";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";

const today = new Date().toISOString().slice(0, 10);

describe("Budget page", () => {
  beforeEach(async () => {
    await db.budgets.clear();
    await db.transactions.clear();
    await db.categories.clear();

    useBudgetStore.setState({ budgets: [], loading: false, error: null });
    useTransactionStore.setState({ transactions: [], loading: false });
    useCategoryStore.setState({ categories: [] });

    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
  });

  it("adds a budget and shows its progress against real spend", async () => {
    await db.transactions.add({
      title: "Lunch",
      amount: 400,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: today,
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Budget />);

    await user.click(screen.getByRole("button", { name: /add budget/i }));
    await user.selectOptions(await screen.findByLabelText("Category"), "Food");
    await user.type(screen.getByLabelText("Amount"), "1000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Food")).toBeInTheDocument();
    expect(within(table).getByText("฿400 / ฿1,000")).toBeInTheDocument();
    expect(within(table).getByText("฿600 left")).toBeInTheDocument();
  });

  it("deletes a budget", async () => {
    await db.budgets.add({ category: "Food", amount: 1000, period: "monthly" });

    const user = userEvent.setup();
    render(<Budget />);

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: /delete food budget/i }));

    await waitFor(() => {
      expect(screen.queryByText("No budgets yet")).toBeInTheDocument();
    });
  });
});
