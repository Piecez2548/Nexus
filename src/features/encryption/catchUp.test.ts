import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { hasUndecryptableLocalData } from "./catchUp";
import { ENCRYPTABLE_TABLES } from "@/features/encryption/migration/migrationShared";

describe("hasUndecryptableLocalData", () => {
  beforeEach(async () => {
    for (const table of ENCRYPTABLE_TABLES) {
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

  // Regression test: this table list used to be a hand-maintained local
  // copy that silently fell 7 tables behind ENCRYPTABLE_TABLES (vaultEntries,
  // workoutExercises/Entries, netWorthItems/Snapshots, subscriptions,
  // budgetPeriodSnapshots) -- an encrypted row synced into any of those
  // would be invisible to this check, skipping AppLockGate's catch-up
  // recovery screen entirely. Proven directly against every table the real
  // migration touches, not a hardcoded subset that can drift again.
  it("detects an encrypted row in every one of the tables enableEncryption/disableEncryption actually migrate", async () => {
    for (const table of ENCRYPTABLE_TABLES) {
      await db.table(table).clear();
      await db.table(table).add({
        syncId: `${table}-from-other-device`,
        updatedAt: "2026-07-25T00:00:00.000Z",
        encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
      } as never);

      expect(await hasUndecryptableLocalData()).toBe(true);

      await db.table(table).clear();
    }
  });
});
