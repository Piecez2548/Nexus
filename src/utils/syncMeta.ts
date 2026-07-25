// Sync metadata shared by every entity that can sync to the cloud.
// `syncId` is a stable cross-device identifier — Dexie's own auto-increment
// `id` is only unique on the device that created the record, so it can't be
// used as the cloud primary key directly.
export interface SyncMeta {
  syncId?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export function withSyncMeta<T extends SyncMeta>(entity: T): T {
  return {
    ...entity,
    syncId: entity.syncId ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
}
