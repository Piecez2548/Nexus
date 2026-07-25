import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Habit } from "../types";

const encrypted = createEncryptedRepository<Habit>(db.habits);

export const habitRepository = {
  getAll: () => encrypted.getAll(),

  add: (habit: Habit) => encrypted.add(withSyncMeta(habit)),

  update: (id: number, habit: Habit) =>
    encrypted.update(id, withSyncMeta({ ...habit, id })),

  remove: async (id: number) => {
    const existing = await db.habits.get(id);
    await db.habits.delete(id);
    await recordTombstone("habits", existing?.syncId);
  },
};
