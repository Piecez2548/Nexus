import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DataSettings from "./DataSettings";
import { db } from "@/database/db";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";

describe("DataSettings", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.categories.clear();
    useAccountStore.setState({ accounts: [], loading: false, error: null });
    useCategoryStore.setState({ categories: [], loading: false, error: null });
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
});
