import { describe, expect, it, beforeEach } from "vitest";
import { exportBackup, importBackup, resetAllData } from "./backupService";
import { db } from "./db";

describe("backupService", () => {
  beforeEach(async () => {
    await Promise.all([
      db.transactions.clear(),
      db.accounts.clear(),
      db.categories.clear(),
      db.trades.clear(),
      db.recipientProfiles.clear(),
      db.merchants.clear(),
      db.budgets.clear(),
      db.goals.clear(),
    ]);
  });

  it("exports all tables into a versioned JSON backup", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    await db.transactions.add({
      title: "Coffee",
      amount: 58,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const json = await exportBackup();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.data.accounts).toHaveLength(1);
    expect(parsed.data.transactions).toHaveLength(1);
    expect(parsed.data.transactions[0]).toMatchObject({ title: "Coffee", amount: 58 });
  });

  it("round-trips data through export then import", async () => {
    await db.accounts.add({ name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" });
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });

    const json = await exportBackup();

    await db.accounts.clear();
    await db.categories.clear();

    await importBackup(json);

    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Bank");
    expect(categories).toHaveLength(1);
  });

  it("rejects a malformed backup without touching existing data", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });

    await expect(importBackup("not json")).rejects.toThrow();
    await expect(importBackup(JSON.stringify({ foo: "bar" }))).rejects.toThrow();

    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
  });

  it("resetAllData clears everything then reseeds defaults", async () => {
    await db.transactions.add({
      title: "Custom",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await resetAllData();

    const transactions = await db.transactions.toArray();
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();

    expect(transactions).toHaveLength(0);
    expect(accounts.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
  });
});
