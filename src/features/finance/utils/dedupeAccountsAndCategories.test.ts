import { describe, expect, it, beforeEach, vi } from "vitest";
import { db } from "@/database/db";
import { dedupeAccountsAndCategories } from "./dedupeAccountsAndCategories";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";

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

  it("fetches the transactions table only once even when several duplicate groups need merging (N+1 regression)", async () => {
    // Two duplicate account groups + one duplicate category group in the
    // same pass -- previously, each of the 3 resulting merge() calls
    // independently re-fetched the entire transactions table. Now the
    // whole pass should read it exactly once and thread the same
    // (returned, updated) array through every subsequent merge call.
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" },
      { name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" },
    ]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
    ]);
    await db.transactions.add({
      title: "Transfer",
      amount: 500,
      type: "transfer",
      account: "Cash",
      toAccount: "Bank",
      date: "2026-07-21",
      status: "completed",
    });

    const getAllSpy = vi.spyOn(transactionRepository, "getAll");

    const result = await dedupeAccountsAndCategories();

    expect(result.accountsMerged).toBe(2);
    expect(result.categoriesMerged).toBe(1);
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    const [transaction] = await db.transactions.toArray();
    expect(transaction.account).toBe("Cash");
    expect(transaction.toAccount).toBe("Bank");

    getAllSpy.mockRestore();
  });

  it("does not touch the transactions table at all when there are no duplicates to merge", async () => {
    await db.accounts.bulkAdd([{ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" }]);
    const getAllSpy = vi.spyOn(transactionRepository, "getAll");

    await dedupeAccountsAndCategories();

    expect(getAllSpy).not.toHaveBeenCalled();
    getAllSpy.mockRestore();
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
