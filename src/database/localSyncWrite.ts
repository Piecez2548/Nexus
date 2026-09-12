import type { Table } from "dexie";
import type { SyncMeta } from "@/utils/syncMeta";
import type { SyncStateRow } from "@/features/sync/types";

const timestamp = (value?: string) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

// Local mutations only: cloud pulls and backup restores retain their versions.
// Allocate the version at persistence time, after asynchronous encryption, so
// another tab/sync pass cannot advance the cursor while this write is pending.
// IndexedDB serializes these transactions across connections/tabs. The clock
// survives restarts and deletion of the table's newest (or last) entity.
export async function writeLocalSyncRows<T extends SyncMeta & { id?: number }>(
  table: Table<T, number>,
  rows: T[],
  mode: "add" | "put" = "put"
): Promise<number[]> {
  if (rows.length === 0) return [];
  const syncState = table.db.table<SyncStateRow, string>("syncState");
  const clockKey = `clock:${table.name}`;

  return table.db.transaction("rw", table, syncState, async () => {
    const [clock, cursor, latest] = await Promise.all([
      syncState.get(clockKey),
      syncState.get(`push:${table.name}`),
      table.orderBy("updatedAt").last(),
    ]);
    let floor = Math.max(timestamp(clock?.value), timestamp(cursor?.value), timestamp(latest?.updatedAt));
    const stamped = rows.map(row => {
      floor = Math.max(Date.now(), floor + 1, timestamp(row.updatedAt) + 1);
      return { ...row, updatedAt: new Date(floor).toISOString() };
    });
    const keys = mode === "add"
      ? await table.bulkAdd(stamped, { allKeys: true })
      : await table.bulkPut(stamped, { allKeys: true });
    await syncState.put({ key: clockKey, value: new Date(floor).toISOString() });
    return keys;
  });
}
