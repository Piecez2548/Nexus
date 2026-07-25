import { db } from "@/database/db";
import type { SyncTableName } from "@/features/sync/types";

// Records that a row was deleted so the sync engine can propagate the
// deletion to other devices. A record that was never synced (no syncId
// yet) has nothing to propagate.
export async function recordTombstone(table: SyncTableName, syncId: string | undefined) {
  if (!syncId) return;

  await db.syncTombstones.add({
    table,
    syncId,
    deletedAt: new Date().toISOString(),
  });
}
