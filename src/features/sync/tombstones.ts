import { db } from "@/database/db";
import type { SyncTableName } from "@/features/sync/types";

// Records that a row was deleted so the sync engine can propagate the
// deletion to other devices. A record that was never synced (no syncId
// yet) has nothing to propagate.
//
// Clears out any earlier tombstone for this same (table, syncId) first —
// deleting the same synced item more than once (e.g. it got resurrected by
// a sync race and the user deleted it again) would otherwise leave two
// tombstones for the same key sitting locally. pushTombstones() combines
// every table's tombstones into a single upsert batch, and Postgres rejects
// a batch that proposes the same (id, table_name) twice outright.
export async function recordTombstone(table: SyncTableName, syncId: string | undefined) {
  if (!syncId) return;

  const existing = await db.syncTombstones.where("syncId").equals(syncId).toArray();
  const staleIds = existing.filter((t) => t.table === table).map((t) => t.id!);
  if (staleIds.length > 0) await db.syncTombstones.bulkDelete(staleIds);

  await db.syncTombstones.add({
    table,
    syncId,
    deletedAt: new Date().toISOString(),
  });
}
