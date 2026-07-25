import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Goal } from "../types";

export const goalRepository = {
  getAll: () => db.goals.toArray(),

  add: (goal: Goal) => db.goals.add(withSyncMeta(goal)),

  update: (id: number, goal: Goal) =>
    db.goals.put(withSyncMeta({ ...goal, id })),

  remove: async (id: number) => {
    const existing = await db.goals.get(id);
    await db.goals.delete(id);
    await recordTombstone("goals", existing?.syncId);
  },
};
