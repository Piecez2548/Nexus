import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";

import { useTodoStore } from "@/features/todo/store/todoStore";
import { PRIORITY_BADGE_CLASS, getPriorityLabels } from "@/features/todo/constants/labels";
import { useDashboardPeriodStore } from "@/features/dashboard/store/dashboardPeriodStore";
import { getDashboardPeriodRange } from "@/features/dashboard/utils/dashboardPeriodRange";
import { useTranslation } from "@/i18n/useTranslation";

export default function TodoPreviewPanel() {
  const { todos, loadTodos, toggleComplete } = useTodoStore();
  const { granularity } = useDashboardPeriodStore();
  const { t } = useTranslation();
  const priorityLabels = getPriorityLabels(t);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const range = getDashboardPeriodRange(granularity);
  const rangeEndKey = `${range.end.getFullYear()}-${String(range.end.getMonth() + 1).padStart(2, "0")}-${String(range.end.getDate()).padStart(2, "0")}`;

  // Undated todos are evergreen and always shown; a dated todo shows once
  // its due date falls on/before the end of the selected period, so an
  // overdue task never silently vanishes from the dashboard. Compared as
  // "yyyy-MM-dd" strings (not `new Date()`, which parses as UTC).
  const pending = todos
    .filter((t) => !t.completed && (t.dueDate === undefined || t.dueDate < rangeEndKey))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("dashboard.todo")}</h2>

        <Link
          to="/todo"
          className="flex items-center gap-1 text-sm text-brand-500 hover:underline"
        >
          <ListChecks size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {pending.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("dashboard.noTodos")}
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((todo) => (
            <div key={todo.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => todo.id !== undefined && toggleComplete(todo.id)}
                aria-label={t("todo.markDone", { name: todo.title })}
                className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-300 dark:border-zinc-600 transition hover:border-brand-500"
              />

              <span className="min-w-0 flex-1 truncate text-sm font-medium">{todo.title}</span>

              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_CLASS[todo.priority]}`}>
                {priorityLabels[todo.priority]}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
