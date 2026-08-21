import { CheckSquare, Flame, Target } from "lucide-react";

import { getPriorityLabels } from "@/features/todo/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutivePriorityCategory, ExecutivePriorityItem, ExecutivePriorityReason } from "@/features/executive/types";
import type { TodoPriority } from "@/features/todo/types";

interface Props {
  priorities: ExecutivePriorityItem[];
}

const CATEGORY_ICON: Record<ExecutivePriorityCategory, typeof CheckSquare> = {
  todo: CheckSquare,
  habit: Flame,
  goal: Target,
};

const MAX_SHOWN = 6;

export default function PrioritySection({ priorities }: Props) {
  const { t } = useTranslation();
  const priorityLabels = getPriorityLabels(t);
  const shown = priorities.slice(0, MAX_SHOWN);

  // reason.params.priority carries the raw TodoPriority enum value (not a
  // translated label -- reasons are plain data from a pure function), so it
  // needs resolving through the same label factory every other priority
  // badge in the app uses before interpolation, or Thai renders would show
  // a bare English "high"/"medium"/"low" mid-sentence.
  function renderReason(reason: ExecutivePriorityReason): string {
    if (reason.key === "executive.reason.priority" && reason.params?.priority) {
      return t(reason.key, { priority: priorityLabels[reason.params.priority as TodoPriority] });
    }
    return t(reason.key, reason.params);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-5 text-xl font-semibold">{t("executive.priority.title")}</h2>

      {shown.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("executive.priority.empty")}</div>
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => {
            const Icon = CATEGORY_ICON[item.category];
            return (
              <li key={item.id} className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.reasons.map(renderReason).join(" · ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
