import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useTodoStore } from "@/features/todo/store/todoStore";
import { getPriorityLabels, PRIORITY_BADGE_CLASS } from "@/features/todo/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { Todo } from "@/features/todo/types";

interface Props {
  todo: Todo;
  onEdit: () => void;
}

function isOverdue(todo: Todo): boolean {
  if (todo.completed || !todo.dueDate) return false;
  return todo.dueDate < new Date().toISOString().slice(0, 10);
}

export default function TodoItem({ todo, onEdit }: Props) {
  const { deleteTodo, toggleComplete } = useTodoStore();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { t, language } = useTranslation();
  const priorityLabels = getPriorityLabels(t);

  async function handleToggle() {
    if (todo.id === undefined) return;

    try {
      setError(null);
      await toggleComplete(todo.id);
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  }

  async function handleDelete() {
    if (todo.id === undefined) return;

    try {
      setError(null);
      await deleteTodo(todo.id);
      toast.success(t("todo.deleteSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={
            todo.completed
              ? t("todo.markNotDone", { name: todo.title })
              : t("todo.markDone", { name: todo.title })
          }
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
            todo.completed
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        >
          {todo.completed && <span className="text-xs">✓</span>}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`font-medium ${todo.completed ? "text-zinc-500 line-through dark:text-zinc-500" : ""}`}>
            {todo.title}
          </p>

          {todo.notes && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{todo.notes}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_CLASS[todo.priority]}`}>
              {priorityLabels[todo.priority]}
            </span>

            {todo.dueDate && (
              <span
                className={`text-xs ${
                  isOverdue(todo) ? "font-semibold text-red-500" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {t("todo.dueDatePrefix", {
                  date: new Date(todo.dueDate).toLocaleDateString(language === "th" ? "th-TH" : "en-US"),
                })}
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label={t("common.editName", { name: todo.title })}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={t("common.deleteName", { name: todo.title })}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
