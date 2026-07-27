import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/database/db";
import { recordTombstone } from "./tombstones";

describe("recordTombstone", () => {
  beforeEach(async () => {
    await db.syncTombstones.clear();
  });

  it("does nothing for a record that was never synced (no syncId)", async () => {
    await recordTombstone("habits", undefined);
    expect(await db.syncTombstones.toArray()).toHaveLength(0);
  });

  it("records a tombstone for a synced record", async () => {
    await recordTombstone("habits", "sync-1");

    const stored = await db.syncTombstones.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ table: "habits", syncId: "sync-1" });
  });

  it("replaces an earlier tombstone for the same (table, syncId) instead of adding a duplicate", async () => {
    // The same synced item can end up deleted more than once locally (e.g.
    // it was resurrected by a sync race and the user deleted it again) —
    // recording a second tombstone for the exact same key must not leave
    // two rows behind, since pushTombstones() combines every table's
    // tombstones into a single upsert batch that Postgres rejects outright
    // if the same (id, table_name) appears twice.
    await recordTombstone("habits", "sync-1");
    await recordTombstone("habits", "sync-1");

    const stored = await db.syncTombstones.toArray();
    expect(stored).toHaveLength(1);
  });

  it("keeps tombstones for the same syncId in different tables separate", async () => {
    await recordTombstone("habits", "shared-id");
    await recordTombstone("calendarEvents", "shared-id");

    const stored = await db.syncTombstones.toArray();
    expect(stored).toHaveLength(2);
  });
});
