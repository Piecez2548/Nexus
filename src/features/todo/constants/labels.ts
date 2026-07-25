import type { TodoPriority, TodoRecurrence } from "@/features/todo/types";

type Translate = (key: string) => string;

export function getPriorityLabels(t: Translate): Record<TodoPriority, string> {
  return {
    low: t("todo.priorityLow"),
    medium: t("todo.priorityMedium"),
    high: t("todo.priorityHigh"),
  };
}

export const PRIORITY_BADGE_CLASS: Record<TodoPriority, string> = {
  low: "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-red-500/15 text-red-400",
};

export function getRecurringLabels(t: Translate): Record<TodoRecurrence, string> {
  return {
    daily: t("todo.recurringDaily"),
    weekly: t("todo.recurringWeekly"),
    monthly: t("todo.recurringMonthly"),
  };
}
