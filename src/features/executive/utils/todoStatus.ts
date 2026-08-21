import { toLocalDateString } from "@/utils/localDate";
import type { Todo } from "@/features/todo/types";

// Mirrors the existing predicate already inlined 3x in this codebase
// (TodoItem.tsx, dashboard/utils/dailySummary.ts, TodoPreviewPanel.tsx) --
// not centralized here into a shared export those call sites are switched
// over to, since retrofitting untouched modules is out of scope for this
// task. New Executive code uses this one; the existing 3 stay as they are.
export function isTodoOverdue(todo: Todo, today: Date = new Date()): boolean {
  if (todo.completed || !todo.dueDate) return false;
  return todo.dueDate < toLocalDateString(today);
}

export function isTodoDueToday(todo: Todo, today: Date = new Date()): boolean {
  if (todo.completed || !todo.dueDate) return false;
  return todo.dueDate === toLocalDateString(today);
}
