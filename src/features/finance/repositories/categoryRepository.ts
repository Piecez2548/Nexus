import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Category } from "../types";

export const categoryRepository = {
  getAll: () => db.categories.toArray(),

  add: (category: Category) => db.categories.add(withSyncMeta(category)),

  update: (id: number, category: Category) =>
    db.categories.update(id, withSyncMeta(category)),

  remove: async (id: number) => {
    const existing = await db.categories.get(id);
    await db.categories.delete(id);
    await recordTombstone("categories", existing?.syncId);
  },
};
