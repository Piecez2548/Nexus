import { describe, expect, it, beforeEach } from "vitest";

import { useCategoryStore } from "./categoryStore";
import { db } from "@/database/db";

describe("categoryStore (Dexie integration)", () => {
  beforeEach(async () => {
    await db.categories.clear();
    await db.transactions.clear();
    useCategoryStore.setState({ categories: [], loading: false, error: null });
  });

  it("addCategory persists to the database and updates state", async () => {
    await useCategoryStore.getState().addCategory({
      name: "Food",
      type: "expense",
      icon: "utensils",
      color: "#ef4444",
    });

    expect(useCategoryStore.getState().categories).toHaveLength(1);
    expect((await db.categories.toArray())[0].name).toBe("Food");
  });

  it("deleteCategory removes a category that has no transactions", async () => {
    const id = await db.categories.add({
      name: "Food",
      type: "expense",
      icon: "utensils",
      color: "#ef4444",
    });

    await useCategoryStore.getState().loadCategories();
    await useCategoryStore.getState().deleteCategory(id, "Food");

    expect(await db.categories.get(id)).toBeUndefined();
  });

  it("refuses to delete a category referenced by a transaction", async () => {
    const id = await db.categories.add({
      name: "Food",
      type: "expense",
      icon: "utensils",
      color: "#ef4444",
    });

    await db.transactions.add({
      title: "Lunch",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await expect(
      useCategoryStore.getState().deleteCategory(id, "Food")
    ).rejects.toThrow();

    expect(await db.categories.get(id)).toBeDefined();
  });

  it("mergeCategory reassigns transactions to the target and removes the source", async () => {
    const foodId = await db.categories.add({
      name: "Lunch",
      type: "expense",
      icon: "utensils",
      color: "#ef4444",
    });

    await db.categories.add({
      name: "Food",
      type: "expense",
      icon: "utensils",
      color: "#f59e0b",
    });

    await db.transactions.bulkAdd([
      {
        title: "Pad Thai",
        amount: 60,
        type: "expense",
        category: "Lunch",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      },
      {
        title: "Coffee",
        amount: 40,
        type: "expense",
        category: "Lunch",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      },
    ]);

    await useCategoryStore.getState().loadCategories();
    await useCategoryStore.getState().mergeCategory(foodId, "Lunch", "Food");

    expect(await db.categories.get(foodId)).toBeUndefined();

    const transactions = await db.transactions.toArray();
    expect(transactions.every((t) => t.category === "Food")).toBe(true);

    const categoryNames = useCategoryStore.getState().categories.map((c) => c.name);
    expect(categoryNames).toEqual(["Food"]);
  });
});
