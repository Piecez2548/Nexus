import { Pencil, Trash2, Bell } from "lucide-react";

import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { getIcon } from "@/features/schedule/constants/icons";
import IconBadge from "@/components/ui/IconBadge";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItem } from "@/features/schedule/types";

interface Props {
  item: ScheduleItem;
  isCurrent: boolean;
  onEdit: () => void;
}

export default function ScheduleItemCard({ item, isCurrent, onEdit }: Props) {
  const { deleteItem } = useScheduleItemStore();
  const { t } = useTranslation();
  const toast = useToast();
  const Icon = getIcon(item.icon);

  async function handleDelete() {
    if (item.id === undefined) return;

    try {
      await deleteItem(item.id);
      toast.success(t("schedule.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-white p-4 transition dark:bg-zinc-900 ${
        isCurrent
          ? "border-brand-500 ring-1 ring-brand-500/30"
          : "border-zinc-200 dark:border-zinc-800"
      } ${!item.enabled ? "opacity-50" : ""}`}
    >
      <IconBadge icon={<Icon size={18} />} color={item.color} size={40} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-medium">{item.title}</h3>
          {item.reminderEnabled && (
            <Bell size={12} className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-label={t("schedule.reminderLabel")} />
          )}
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {item.startTime}
          {item.endTime ? `–${item.endTime}` : ""}
          {item.category ? ` · ${item.category}` : ""}
        </span>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          onClick={onEdit}
          aria-label={t("schedule.editItemName", { title: item.title })}
          className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={handleDelete}
          aria-label={t("schedule.deleteItemName", { title: item.title })}
          className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
