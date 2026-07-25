import type { SyncMeta } from "@/utils/syncMeta";

export type TodoPriority = "low" | "medium" | "high";

export type TodoRecurrence = "daily" | "weekly" | "monthly";

export interface Todo extends SyncMeta {
  id?: number;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: TodoPriority;
  recurring?: TodoRecurrence;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}
