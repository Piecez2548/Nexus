import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { hasUndecryptableLocalData } from "./catchUp";

const SYNCED_TABLES = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
  "habits",
  "holdings",
] as const;

describe("hasUndecryptableLocalData", () => {
  beforeEach(async () => {
    for (const table of SYNCED_TABLES) {
      await db.table(table).clear();
    }
  });

  it("returns false when no synced table has any rows", async () => {
    expect(await hasUndecryptableLocalData()).toBe(false);
  });

  it("returns false when all rows are plaintext", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-25",
      status: "completed",
    });

    expect(await hasUndecryptableLocalData()).toBe(false);
  });

  it("returns true when a table has a row with encryptedContent (synced from another device)", async () => {
    await db.todos.add({
      syncId: "todo-from-other-device",
      updatedAt: "2026-07-25T00:00:00.000Z",
      encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
    } as never);

    expect(await hasUndecryptableLocalData()).toBe(true);
  });
});
