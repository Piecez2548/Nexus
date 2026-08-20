import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/database/db";
import { accountService } from "./accountService";

// Regression: update() only ever wrote the account's own row -- unlike
// remove() (delete-guard) and merge() (explicit reassignment), a plain
// rename via the Edit form had no cascade at all. Every transaction still
// holding the old account name would silently disappear from that
// account's filtered views/balance the moment the name changed.
describe("accountService.update (rename cascade)", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
  });

  it("reassigns every transaction's account field when the account is renamed", async () => {
    const id = await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    const txId = await db.transactions.add({
      title: "Coffee",
      amount: 50,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await accountService.update(id, { id, name: "Wallet", type: "cash", icon: "wallet", color: "#16a34a" });

    const tx = await db.transactions.get(txId);
    expect((tx as unknown as { account: string }).account).toBe("Wallet");
  });

  it("also reassigns transfer transactions' toAccount field", async () => {
    const id = await db.accounts.add({ name: "Bank", type: "bank", icon: "landmark", color: "#3b82f6" });
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    const txId = await db.transactions.add({
      title: "Transfer",
      amount: 100,
      type: "transfer",
      account: "Cash",
      toAccount: "Bank",
      date: "2026-07-21",
      status: "completed",
    });

    await accountService.update(id, { id, name: "Savings", type: "bank", icon: "landmark", color: "#3b82f6" });

    const tx = await db.transactions.get(txId);
    expect((tx as unknown as { toAccount: string }).toAccount).toBe("Savings");
  });

  it("does not touch transactions when the account is updated without renaming it", async () => {
    const id = await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    const txId = await db.transactions.add({
      title: "Coffee",
      amount: 50,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    await accountService.update(id, { id, name: "Cash", type: "cash", icon: "landmark", color: "#3b82f6" });

    const tx = await db.transactions.get(txId);
    expect((tx as unknown as { account: string }).account).toBe("Cash");
  });
});

// Basic single-merge behavior (the manual "Merge Duplicates" UI's only use
// case) is already covered end-to-end via dedupeAccountsAndCategories.test.ts
// and the real Settings flow. These tests cover only the newer part of the
// contract: the optional pre-fetched `transactions` param and the returned
// updated array, added so a caller merging several duplicates in one pass
// can fetch the transactions table once instead of once per merge.
describe("accountService.merge", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
  });

  it("accepts a pre-fetched transactions array instead of reading the table itself", async () => {
    const sourceId = await db.accounts.add({ name: "Old Wallet", type: "cash", icon: "wallet", color: "#16a34a" });
    const preloaded = [
      { id: 1, title: "Coffee", amount: 50, type: "expense" as const, account: "Old Wallet", date: "2026-07-21" },
    ];

    const updated = await accountService.merge(sourceId, "Old Wallet", "Cash", preloaded);

    expect(updated[0].account).toBe("Cash");
  });

  it("threading the returned array into a second call lets that call see the first call's update", async () => {
    // Simulates two sequential merges in one pass, exactly how
    // dedupeAccountsAndCategories.ts composes them -- a transaction whose
    // account is fixed by the first call must not have that fix silently
    // discarded by a second call still working from the original snapshot.
    const sourceIdA = await db.accounts.add({ name: "Wallet A", type: "cash", icon: "wallet", color: "#16a34a" });
    const sourceIdB = await db.accounts.add({ name: "Wallet B", type: "cash", icon: "wallet", color: "#16a34a" });
    const txId = await db.transactions.add({
      title: "Transfer",
      amount: 100,
      type: "transfer",
      account: "Wallet A",
      toAccount: "Wallet B",
      date: "2026-07-21",
      status: "completed",
    });

    let transactions = await db.transactions.toArray();
    transactions = await accountService.merge(sourceIdA, "Wallet A", "Cash", transactions);
    transactions = await accountService.merge(sourceIdB, "Wallet B", "Bank", transactions);

    expect(transactions.find((t) => t.id === txId)).toMatchObject({ account: "Cash", toAccount: "Bank" });

    const stored = await db.transactions.get(txId);
    expect(stored).toMatchObject({ account: "Cash", toAccount: "Bank" });
  });

  it("still reads the table itself when no transactions array is passed", async () => {
    const sourceId = await db.accounts.add({ name: "Old Wallet", type: "cash", icon: "wallet", color: "#16a34a" });
    await db.transactions.add({
      title: "Coffee",
      amount: 50,
      type: "expense",
      account: "Old Wallet",
      date: "2026-07-21",
      status: "completed",
    });

    await accountService.merge(sourceId, "Old Wallet", "Cash");

    const [transaction] = await db.transactions.toArray();
    expect(transaction.account).toBe("Cash");
  });
});
