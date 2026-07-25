import { describe, expect, it } from "vitest";
import Dexie from "dexie";

// Isolated from the real "NexusDatabase" used everywhere else in the test
// suite — this test opens its own Dexie instance against a throwaway
// database name so it can simulate "a device still on the old schema"
// without touching (or being affected by) any other test's data.
const TEST_DB_NAME = "NexusDatabase-v8-to-v9-upgrade-test";

describe("Dexie v8 -> v9 schema upgrade (encryption index trim)", () => {
  it("preserves every existing field on a row after the v9 index trim, even though most of those fields are no longer indexed", async () => {
    // Simulate a device still running the pre-encryption app build.
    const v8Db = new Dexie(TEST_DB_NAME);
    v8Db.version(8).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,recipient,*tags,syncId,updatedAt",
    });
    await v8Db.open();

    const id = await v8Db.table("transactions").add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      recipient: "",
      tags: ["morning"],
      syncId: "abc-123",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });
    v8Db.close();

    // Open the same underlying database through the full schema chain
    // including the new v9 index trim — this is exactly what happens when
    // an existing install picks up the app update.
    const v9Db = new Dexie(TEST_DB_NAME);
    v9Db.version(8).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,recipient,*tags,syncId,updatedAt",
    });
    v9Db.version(9).stores({
      transactions: "++id,syncId,updatedAt",
    });
    await v9Db.open();

    const row = await v9Db.table("transactions").get(id);

    expect(row).toMatchObject({
      title: "Coffee",
      amount: 120,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      tags: ["morning"],
      syncId: "abc-123",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    v9Db.close();
    await Dexie.delete(TEST_DB_NAME);
  });
});
