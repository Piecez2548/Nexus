import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DataSettings from "./DataSettings";
import { db } from "@/database/db";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

describe("DataSettings", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.categories.clear();
    await db.transactions.clear();
    useAccountStore.setState({ accounts: [], loading: false, error: null });
    useCategoryStore.setState({ categories: [], loading: false, error: null });
    useTransactionStore.setState({ transactions: [], loading: false, error: null });
  });

  it("merges duplicate accounts and categories and reports how many were merged", async () => {
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
    ]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /merge duplicates/i }));

    expect(await screen.findByText(/Merged 1 duplicate accounts and 1 duplicate categories/)).toBeInTheDocument();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.categories.count()).toBe(1);
  });

  it("reports when there's nothing to merge", async () => {
    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /merge duplicates/i }));

    expect(await screen.findByText("No duplicates found")).toBeInTheDocument();
  });

  it("finds duplicate transactions, previews them, and merges on confirm", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Unrelated", amount: 50, type: "expense", category: "Food", account: "Cash", date: "2026-07-22", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));

    expect(await screen.findByText("Found 1 duplicate group(s)")).toBeInTheDocument();
    expect(screen.getByText("Kept (oldest)")).toBeInTheDocument();
    expect(screen.getByText("1 duplicate(s) will be removed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Merge" }));

    expect(await screen.findByText("Removed 1 duplicate transactions")).toBeInTheDocument();
    expect(await db.transactions.count()).toBe(2);
    const titles = (await db.transactions.toArray()).map((t) => t.title).sort();
    expect(titles).toEqual(["Lunch", "Unrelated"]);
  });

  it("does not open the preview and reports nothing found when there are no duplicate transactions", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Dinner", amount: 200, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));

    expect(await screen.findByText("No duplicate transactions found")).toBeInTheDocument();
    expect(screen.queryByText(/Found \d+ duplicate group/)).not.toBeInTheDocument();
    expect(await db.transactions.count()).toBe(2);
  });

  it("cancels the preview without deleting anything", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));
    expect(await screen.findByText("Found 1 duplicate group(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Found 1 duplicate group(s)")).not.toBeInTheDocument());
    expect(await db.transactions.count()).toBe(2);
  });
});
