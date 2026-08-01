import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { ScheduleItem } from "../types";

const encrypted = createEncryptedRepository<ScheduleItem>(db.scheduleItems);

export const scheduleItemRepository = {
  getAll: () => encrypted.getAll(),

  add: (item: ScheduleItem) => encrypted.add(withSyncMeta(item)),

  update: (id: number, item: ScheduleItem) =>
    encrypted.update(id, withSyncMeta({ ...item, id })),

  remove: async (id: number) => {
    const existing = await db.scheduleItems.get(id);
    await db.scheduleItems.delete(id);
    await recordTombstone("scheduleItems", existing?.syncId);
  },
};
