import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Category } from "../types";

const encrypted = createEncryptedRepository<Category>(db.categories);

export const categoryRepository = {
  getAll: () => encrypted.getAll(),

  add: (category: Category) => encrypted.add(withSyncMeta(category)),

  update: (id: number, category: Category) =>
    encrypted.update(id, withSyncMeta({ ...category, id })),

  remove: async (id: number) => {
    const existing = await db.categories.get(id);
    await db.categories.delete(id);
    await recordTombstone("categories", existing?.syncId);
  },
};
