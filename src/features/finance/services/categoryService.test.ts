import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/database/db";
import { categoryService } from "./categoryService";

describe("categoryService.remove", () => {
  beforeEach(async () => {
    await db.categories.clear();
    await db.transactions.clear();
    await db.budgets.clear();
  });

  it("removes a category with no transactions and no budget", async () => {
    const id = await db.categories.add({ name: "Unused", type: "expense", icon: "tag", color: "#000000" });

    await categoryService.remove(id, "Unused");

    expect(await db.categories.get(id)).toBeUndefined();
  });

  it("refuses to remove a category with existing transactions", async () => {
    const id = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.transactions.add({
      title: "Lunch",
      amount: 100,
      type: "expense",
      account: "Cash",
      category: "Food",
      date: "2026-07-21",
      status: "completed",
    });

    await expect(categoryService.remove(id, "Food")).rejects.toThrow();
    expect(await db.categories.get(id)).not.toBeUndefined();
  });

  // Regression: remove() only ever checked transactions -- a category with
  // zero transactions but a Budget scoped to it could be deleted, silently
  // orphaning that budget (it would keep referencing a category name that
  // no longer exists anywhere).
  it("refuses to remove a category with a budget assigned to it, even with zero transactions", async () => {
    const id = await db.categories.add({ name: "Entertainment", type: "expense", icon: "film", color: "#8b5cf6" });
    await db.budgets.add({ category: "Entertainment", amount: 1000, period: "monthly" });

    await expect(categoryService.remove(id, "Entertainment")).rejects.toThrow();

    expect(await db.categories.get(id)).not.toBeUndefined();
    const [budget] = await db.budgets.toArray();
    expect(budget.category).toBe("Entertainment");
  });
});
