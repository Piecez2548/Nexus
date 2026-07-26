import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/database/db";
import { findTransactionDuplicates, mergeTransactionDuplicates } from "./dedupeTransactions";
import type { Transaction } from "@/features/finance/types";

function sample(overrides: Partial<Transaction> = {}): Transaction {
  return {
    title: "Lunch",
    amount: 100,
    type: "expense",
    category: "Food",
    account: "Cash",
    date: "2026-07-21",
    status: "completed",
    ...overrides,
  };
}

describe("findTransactionDuplicates", () => {
  beforeEach(async () => {
    await db.transactions.clear();
  });

  it("finds nothing when there are no duplicates", async () => {
    await db.transactions.bulkAdd([
      sample({ title: "Lunch" }),
      sample({ title: "Dinner" }),
    ]);

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(0);
  });

  it("groups a full-field-match duplicate, keeping the oldest by id", async () => {
    const keepId = await db.transactions.add(sample());
    const removeId = await db.transactions.add(sample());

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe(keepId);
    expect(groups[0].remove.map((t) => t.id)).toEqual([removeId]);
  });

  it("does NOT group two transactions that differ in even one field (e.g. two separate ฿100 lunches)", async () => {
    await db.transactions.bulkAdd([
      sample({ title: "Lunch with Alex" }),
      sample({ title: "Lunch with Sam" }),
    ]);

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(0);
  });

  it("does NOT group transactions with the same amount/date/category but a different note", async () => {
    await db.transactions.bulkAdd([
      sample({ note: "with the team" }),
      sample({ note: "solo" }),
    ]);

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(0);
  });

  it("groups tags that match regardless of array order", async () => {
    await db.transactions.bulkAdd([
      sample({ tags: ["work", "essential"] }),
      sample({ tags: ["essential", "work"] }),
    ]);

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(1);
  });

  it("matching is case-insensitive on title/account/category/recipient", async () => {
    await db.transactions.bulkAdd([
      sample({ title: "Lunch", account: "cash", category: "food", recipient: "STARBUCKS" }),
      sample({ title: "lunch", account: "Cash", category: "Food", recipient: "starbucks" }),
    ]);

    const groups = findTransactionDuplicates(await db.transactions.toArray());

    expect(groups).toHaveLength(1);
  });
});

describe("mergeTransactionDuplicates", () => {
  beforeEach(async () => {
    await db.transactions.clear();
  });

  it("removes every duplicate except the oldest, leaving it untouched", async () => {
    const keepId = await db.transactions.add(sample());
    await db.transactions.add(sample());
    await db.transactions.add(sample());
    const unrelatedId = await db.transactions.add(sample({ title: "Unrelated" }));

    const groups = findTransactionDuplicates(await db.transactions.toArray());
    const removed = await mergeTransactionDuplicates(groups);

    expect(removed).toBe(2);
    const remaining = await db.transactions.toArray();
    expect(remaining.map((t) => t.id).sort()).toEqual([keepId, unrelatedId].sort());
  });

  it("is a no-op when given no groups", async () => {
    await db.transactions.add(sample());

    const removed = await mergeTransactionDuplicates([]);

    expect(removed).toBe(0);
    expect(await db.transactions.count()).toBe(1);
  });
});
