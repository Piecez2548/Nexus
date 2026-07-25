import { describe, expect, it, beforeEach } from "vitest";

import { useTransactionStore } from "./transactionStore";
import { db } from "@/database/db";

describe("transactionStore (Dexie integration)", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useTransactionStore.setState({ transactions: [], loading: false });
  });

  it("loadTransactions reads from the database", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await useTransactionStore.getState().loadTransactions();

    expect(useTransactionStore.getState().transactions).toHaveLength(1);
    expect(useTransactionStore.getState().transactions[0].title).toBe("Coffee");
  });

  it("addTransaction persists to the database and updates state", async () => {
    await useTransactionStore.getState().addTransaction({
      title: "Salary",
      amount: 30000,
      type: "income",
      category: "Salary",
      account: "Bank",
      date: "2026-07-01",
      status: "completed",
    });

    expect(useTransactionStore.getState().transactions).toHaveLength(1);

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].amount).toBe(30000);
  });

  it("updateTransaction modifies an existing record", async () => {
    const id = await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await useTransactionStore.getState().updateTransaction(id, {
      title: "Coffee (large)",
      amount: 150,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const updated = await db.transactions.get(id);
    expect(updated?.title).toBe("Coffee (large)");
    expect(updated?.amount).toBe(150);

    expect(useTransactionStore.getState().transactions[0].amount).toBe(150);
  });

  it("toggleFavorite flips the favorite flag and persists it", async () => {
    const id = await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await useTransactionStore.getState().loadTransactions();
    const transaction = useTransactionStore.getState().transactions[0];

    await useTransactionStore.getState().toggleFavorite(transaction);

    expect(useTransactionStore.getState().transactions[0].favorite).toBe(true);
    expect((await db.transactions.get(id))?.favorite).toBe(true);

    await useTransactionStore.getState().toggleFavorite(
      useTransactionStore.getState().transactions[0]
    );

    expect(useTransactionStore.getState().transactions[0].favorite).toBe(false);
  });

  it("deleteTransaction removes the record", async () => {
    const id = await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await useTransactionStore.getState().loadTransactions();
    expect(useTransactionStore.getState().transactions).toHaveLength(1);

    await useTransactionStore.getState().deleteTransaction(id);

    expect(useTransactionStore.getState().transactions).toHaveLength(0);
    expect(await db.transactions.get(id)).toBeUndefined();
  });
});
