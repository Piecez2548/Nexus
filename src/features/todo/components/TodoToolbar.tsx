import { Search, RotateCcw } from "lucide-react";

import { getPriorityLabels } from "@/features/todo/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  search: string;
  setSearch: (value: string) => void;

  filterStatus: string;
  setFilterStatus: (value: string) => void;

  filterPriority: string;
  setFilterPriority: (value: string) => void;
}

export default function TodoToolbar({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
}: Props) {
  const { t } = useTranslation();
  const priorityLabels = getPriorityLabels(t);

  return (
    <div className="flex flex-wrap gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">

      <div className="relative min-w-[220px] flex-1">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("todo.searchPlaceholder")}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500"
        />
      </div>

      <select
        aria-label={t("todo.statusLabel")}
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500"
      >
        <option value="all">{t("common.all")}</option>
        <option value="pending">{t("todo.statusPending")}</option>
        <option value="completed">{t("todo.statusCompleted")}</option>
      </select>

      <select
        aria-label={t("todo.priorityLabel")}
        value={filterPriority}
        onChange={(e) => setFilterPriority(e.target.value)}
        className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500"
      >
        <option value="all">{t("todo.allPriorities")}</option>
        {Object.entries(priorityLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          setSearch("");
          setFilterStatus("all");
          setFilterPriority("all");
        }}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <RotateCcw size={14} />
        {t("common.reset")}
      </button>

    </div>
  );
}
