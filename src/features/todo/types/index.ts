import type { SyncMeta } from "@/utils/syncMeta";

export type TodoPriority = "low" | "medium" | "high";

export interface Todo extends SyncMeta {
  id?: number;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: TodoPriority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}
