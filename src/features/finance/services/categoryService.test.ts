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

// Regression: update() only ever wrote the category's own row -- unlike
// remove() (delete-guard) and merge() (explicit reassignment), a plain
// rename via the Edit form had no cascade at all. Every transaction and
// budget still holding the old category name would silently orphan the
// moment the name changed.
describe("categoryService.update (rename cascade)", () => {
  beforeEach(async () => {
    await db.categories.clear();
    await db.transactions.clear();
    await db.budgets.clear();
  });

  it("reassigns every transaction's category field when the category is renamed", async () => {
    const id = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    const txId = await db.transactions.add({
      title: "Lunch",
      amount: 100,
      type: "expense",
      account: "Cash",
      category: "Food",
      date: "2026-07-21",
      status: "completed",
    });

    await categoryService.update(id, { id, name: "Dining", type: "expense", icon: "utensils", color: "#ef4444" });

    const tx = await db.transactions.get(txId);
    expect((tx as unknown as { category: string }).category).toBe("Dining");
  });

  it("reassigns a budget scoped to the renamed category", async () => {
    const id = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    const budgetId = await db.budgets.add({ category: "Food", amount: 1000, period: "monthly" });

    await categoryService.update(id, { id, name: "Dining", type: "expense", icon: "utensils", color: "#ef4444" });

    const budget = await db.budgets.get(budgetId);
    expect(budget!.category).toBe("Dining");
  });

  it("refuses to rename into a name that already has its own budget, leaving nothing partially renamed", async () => {
    const id = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    const foodBudgetId = await db.budgets.add({ category: "Food", amount: 1000, period: "monthly" });
    await db.budgets.add({ category: "Dining", amount: 500, period: "monthly" });
    const txId = await db.transactions.add({
      title: "Lunch",
      amount: 100,
      type: "expense",
      account: "Cash",
      category: "Food",
      date: "2026-07-21",
      status: "completed",
    });

    await expect(
      categoryService.update(id, { id, name: "Dining", type: "expense", icon: "utensils", color: "#ef4444" })
    ).rejects.toThrow();

    // Nothing was touched -- not the transaction, not the budget, not the
    // category itself -- confirming the collision is caught before any
    // write, not partway through the cascade.
    const tx = await db.transactions.get(txId);
    expect((tx as unknown as { category: string }).category).toBe("Food");
    const foodBudget = await db.budgets.get(foodBudgetId);
    expect(foodBudget!.category).toBe("Food");
    const category = await db.categories.get(id);
    expect((category as unknown as { name: string }).name).toBe("Food");
  });

  it("does not touch transactions or budgets when the category is updated without renaming it", async () => {
    const id = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    const budgetId = await db.budgets.add({ category: "Food", amount: 1000, period: "monthly" });

    await categoryService.update(id, { id, name: "Food", type: "expense", icon: "landmark", color: "#3b82f6" });

    const budget = await db.budgets.get(budgetId);
    expect(budget!.category).toBe("Food");
  });
});
