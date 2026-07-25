import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Todo } from "../types";

export const todoRepository = {
  getAll: () => db.todos.toArray(),

  add: (todo: Todo) => db.todos.add(withSyncMeta(todo)),

  update: (id: number, todo: Todo) =>
    db.todos.put(withSyncMeta({ ...todo, id })),

  remove: async (id: number) => {
    const existing = await db.todos.get(id);
    await db.todos.delete(id);
    await recordTombstone("todos", existing?.syncId);
  },
};
