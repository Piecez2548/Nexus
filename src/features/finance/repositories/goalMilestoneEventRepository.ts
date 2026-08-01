import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { GoalMilestoneEvent } from "../types";

const encrypted = createEncryptedRepository<GoalMilestoneEvent>(db.goalMilestoneEvents);

export const goalMilestoneEventRepository = {
  getAll: () => encrypted.getAll(),

  getForGoal: async (goalSyncId: string) => {
    const all = await encrypted.getAll();
    return all.filter((event) => event.goalSyncId === goalSyncId);
  },

  add: (event: GoalMilestoneEvent) => encrypted.add(withSyncMeta(event)),

  remove: async (id: number) => {
    const existing = await db.goalMilestoneEvents.get(id);
    await db.goalMilestoneEvents.delete(id);
    await recordTombstone("goalMilestoneEvents", existing?.syncId);
  },
};
