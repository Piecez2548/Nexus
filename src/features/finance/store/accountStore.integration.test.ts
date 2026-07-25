import { describe, expect, it, beforeEach } from "vitest";

import { useAccountStore } from "./accountStore";
import { db } from "@/database/db";

describe("accountStore (Dexie integration)", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    useAccountStore.setState({ accounts: [], loading: false, error: null });
  });

  it("addAccount persists to the database and updates state", async () => {
    await useAccountStore.getState().addAccount({
      name: "Cash",
      type: "cash",
      icon: "wallet",
      color: "#3b82f6",
    });

    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect((await db.accounts.toArray())[0].name).toBe("Cash");
  });

  it("updateAccount modifies an existing record", async () => {
    const id = await db.accounts.add({
      name: "Cash",
      type: "cash",
      icon: "wallet",
      color: "#3b82f6",
    });

    await useAccountStore.getState().updateAccount(id, {
      name: "Wallet",
      type: "cash",
      icon: "wallet",
      color: "#16a34a",
    });

    const updated = await db.accounts.get(id);
    expect(updated?.name).toBe("Wallet");
    expect(useAccountStore.getState().accounts[0]?.name).toBe("Wallet");
  });

  it("deleteAccount removes an account that has no transactions", async () => {
    const id = await db.accounts.add({
      name: "Cash",
      type: "cash",
      icon: "wallet",
      color: "#3b82f6",
    });

    await useAccountStore.getState().loadAccounts();
    await useAccountStore.getState().deleteAccount(id, "Cash");

    expect(await db.accounts.get(id)).toBeUndefined();
    expect(useAccountStore.getState().accounts).toHaveLength(0);
  });

  it("refuses to delete an account referenced by a transaction", async () => {
    const id = await db.accounts.add({
      name: "Cash",
      type: "cash",
      icon: "wallet",
      color: "#3b82f6",
    });

    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await expect(
      useAccountStore.getState().deleteAccount(id, "Cash")
    ).rejects.toThrow();

    expect(await db.accounts.get(id)).toBeDefined();
  });

  it("refuses to delete an account referenced as a transfer destination", async () => {
    const id = await db.accounts.add({
      name: "Bank",
      type: "bank",
      icon: "landmark",
      color: "#2563eb",
    });

    await db.transactions.add({
      title: "Move money",
      amount: 500,
      type: "transfer",
      account: "Cash",
      toAccount: "Bank",
      date: "2026-07-21",
      status: "completed",
    });

    await expect(
      useAccountStore.getState().deleteAccount(id, "Bank")
    ).rejects.toThrow();
  });
});
