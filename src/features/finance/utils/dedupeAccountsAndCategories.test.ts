import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/database/db";
import { dedupeAccountsAndCategories } from "./dedupeAccountsAndCategories";

describe("dedupeAccountsAndCategories", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.categories.clear();
    await db.transactions.clear();
  });

  it("does nothing when there are no duplicates", async () => {
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" },
    ]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
    ]);

    const result = await dedupeAccountsAndCategories();

    expect(result).toEqual({ accountsMerged: 0, categoriesMerged: 0 });
    expect(await db.accounts.count()).toBe(2);
    expect(await db.categories.count()).toBe(1);
  });

  it("merges duplicate accounts (same name and type) into the oldest one, reassigning transactions", async () => {
    const canonicalId = await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });

    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const result = await dedupeAccountsAndCategories();

    expect(result.accountsMerged).toBe(1);
    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe(canonicalId);

    const transactions = await db.transactions.toArray();
    expect(transactions[0].account).toBe("Cash");
  });

  it("merges duplicate categories (same name and type) into the oldest one", async () => {
    const canonicalId = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });

    const result = await dedupeAccountsAndCategories();

    expect(result.categoriesMerged).toBe(1);
    const categories = await db.categories.toArray();
    expect(categories).toHaveLength(1);
    expect(categories[0].id).toBe(canonicalId);
  });

  it("merges accounts with the same name even when their type field differs or is missing (legacy data)", async () => {
    const canonicalId = await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    // @ts-expect-error simulating a legacy row written before `type` was required
    await db.accounts.add({ name: "Cash", icon: "wallet", color: "#16a34a" });
    await db.accounts.add({ name: "cash", type: "digital_wallet", icon: "wallet", color: "#16a34a" });

    const result = await dedupeAccountsAndCategories();

    expect(result.accountsMerged).toBe(2);
    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe(canonicalId);
  });

  it("does not merge categories with the same name but different type", async () => {
    await db.categories.bulkAdd([
      { name: "Investment", type: "income", icon: "trending-up", color: "#16a34a" },
      { name: "Investment", type: "expense", icon: "trending-up", color: "#0891b2" },
    ]);

    const result = await dedupeAccountsAndCategories();

    expect(result.categoriesMerged).toBe(0);
    expect(await db.categories.count()).toBe(2);
  });
});
