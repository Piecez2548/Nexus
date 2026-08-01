import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { getCurrentAndNext } from "@/features/schedule/utils/activity";
import { toMinutes } from "@/features/schedule/utils/time";
import { useNowTick } from "@/features/schedule/hooks/useNowTick";
import CurrentActivityCard from "@/features/schedule/components/CurrentActivityCard";
import ScheduleTimeline from "@/features/schedule/components/ScheduleTimeline";
import ScheduleItemForm from "@/features/schedule/components/ScheduleItemForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItem } from "@/features/schedule/types";

export default function LifeSchedule() {
  const { items, loading, error, loadItems } = useScheduleItemStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const { t } = useTranslation();
  const now = useNowTick();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function handleAdd() {
    setSelectedItem(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(item: ScheduleItem) {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  }

  const { current } = getCurrentAndNext(items, now);
  // The timeline is always time-sorted — dragging to reorder is really
  // dragging to retime (see utils/reorder.ts), so display order and
  // chronological order can never drift apart from each other.
  const timeSortedItems = [...items].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || (a.id ?? 0) - (b.id ?? 0)
  );

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("schedule.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("schedule.addItem")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadItems} />
      ) : loading && items.length === 0 ? (
        <LoadingState label={t("schedule.loading")} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("schedule.emptyState")}
        </div>
      ) : (
        <>
          <CurrentActivityCard items={items} />
          <ScheduleTimeline items={timeSortedItems} currentItemId={current?.id} onEdit={handleEdit} />
        </>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <ScheduleItemForm item={selectedItem} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
