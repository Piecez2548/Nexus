import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Todo } from "../types";

const encrypted = createEncryptedRepository<Todo>(db.todos);

export const todoRepository = {
  getAll: () => encrypted.getAll(),

  add: (todo: Todo) => encrypted.add(withSyncMeta(todo)),

  update: (id: number, todo: Todo) =>
    encrypted.update(id, withSyncMeta({ ...todo, id })),

  remove: async (id: number) => {
    const existing = await db.todos.get(id);
    await db.todos.delete(id);
    await recordTombstone("todos", existing?.syncId);
  },
};
