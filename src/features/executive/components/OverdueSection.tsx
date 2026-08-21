import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveTodoItem } from "@/features/executive/types";

interface Props {
  overdueTodos: ExecutiveTodoItem[];
}

const MAX_SHOWN = 5;

export default function OverdueSection({ overdueTodos }: Props) {
  const { t } = useTranslation();
  const shown = overdueTodos.slice(0, MAX_SHOWN);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("executive.overdue.title")}</h2>
        <Link to="/todo" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          {t("common.viewAll")}
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("executive.overdue.empty")}</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{todo.title}</span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{todo.dueDate}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
