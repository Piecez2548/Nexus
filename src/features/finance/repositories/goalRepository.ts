import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Goal } from "../types";

const encrypted = createEncryptedRepository<Goal>(db.goals);

export const goalRepository = {
  getAll: () => encrypted.getAll(),

  add: (goal: Goal) => encrypted.add(withSyncMeta(goal)),

  update: (id: number, goal: Goal) =>
    encrypted.update(id, withSyncMeta({ ...goal, id })),

  remove: async (id: number) => {
    const existing = await db.goals.get(id);
    await db.goals.delete(id);
    await recordTombstone("goals", existing?.syncId);
  },
};
