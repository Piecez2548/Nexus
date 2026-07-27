import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Favorites from "./Favorites";
import TransactionDrawer from "@/features/finance/components/TransactionDrawer";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTransactionTemplateStore } from "@/features/finance/store/transactionTemplateStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useUIStore } from "@/features/finance/store/uiStore";

function renderFavoritesPage() {
  return render(
    <>
      <Favorites />
      <TransactionDrawer />
    </>
  );
}

describe("Favorites page", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.transactionTemplates.clear();
    await db.accounts.clear();
    await db.categories.clear();
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
    ]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
    ]);

    useTransactionStore.setState({ transactions: [], loading: false, error: null });
    useTransactionTemplateStore.setState({ templates: [], loading: false, error: null });
    useAccountStore.setState({ accounts: [], loading: false, error: null });
    useCategoryStore.setState({ categories: [], loading: false, error: null });
    useUIStore.setState({ isTransactionDrawerOpen: false, selectedTransaction: null });
  });

  it("shows an empty state when there are no favorites", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    renderFavoritesPage();

    expect(
      await screen.findByText(/No favorites yet/)
    ).toBeInTheDocument();
  });

  it("lists only favorited transactions", async () => {
    await db.transactions.bulkAdd([
      {
        title: "Coffee",
        amount: 100,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
        favorite: true,
      },
      {
        title: "Rent",
        amount: 8000,
        type: "expense",
        category: "Utilities",
        account: "Bank",
        date: "2026-07-01",
        status: "completed",
        favorite: false,
      },
    ]);

    renderFavoritesPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Coffee")).toBeInTheDocument();
    expect(within(table).queryByText("Rent")).not.toBeInTheDocument();
  });

  it("unfavoriting a transaction removes it from the list", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      favorite: true,
    });

    const user = userEvent.setup();
    renderFavoritesPage();

    const table = await screen.findByRole("table");
    const row = within(table).getByText("Coffee").closest("tr")!;
    const unfavoriteButton = within(row).getByRole("button", { name: /unfavorite/i });
    await user.click(unfavoriteButton);

    expect(await screen.findByText(/No favorites yet/)).toBeInTheDocument();
  });

  it("creates a Quick Add template", async () => {
    const user = userEvent.setup();
    renderFavoritesPage();

    await user.click(await screen.findByRole("button", { name: "เพิ่ม" }));

    await user.type(await screen.findByLabelText("ชื่อ"), "Starbucks");
    await user.selectOptions(screen.getByLabelText("หมวดหมู่"), "Food");
    await user.selectOptions(screen.getByLabelText("บัญชี"), "Cash");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByRole("button", { name: "Starbucks" })).toBeInTheDocument();

    const stored = await db.transactionTemplates.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Starbucks");
  });

  it("clicking a Quick Add template opens the transaction drawer pre-filled", async () => {
    await db.transactionTemplates.add({
      name: "Starbucks",
      type: "expense",
      category: "Food",
      account: "Cash",
      amount: 65,
    });

    const user = userEvent.setup();
    renderFavoritesPage();

    await user.click(await screen.findByRole("button", { name: "Starbucks" }));

    expect(await screen.findByLabelText("ชื่อรายการ")).toHaveValue("Starbucks");
    expect(screen.getByLabelText("จำนวนเงิน")).toHaveValue(65);
    expect(screen.getByLabelText("หมวดหมู่")).toHaveValue("Food");
    expect(screen.getByLabelText("บัญชี")).toHaveValue("Cash");

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Starbucks");
    expect(stored[0].amount).toBe(65);
  });

  it("deletes a Quick Add template", async () => {
    await db.transactionTemplates.add({
      name: "Starbucks",
      type: "expense",
      category: "Food",
      account: "Cash",
    });

    const user = userEvent.setup();
    renderFavoritesPage();

    await user.click(await screen.findByRole("button", { name: "Delete quick add Starbucks" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Starbucks" })).not.toBeInTheDocument();
    });
    expect(await db.transactionTemplates.count()).toBe(0);
  });
});
