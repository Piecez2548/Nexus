import { useEffect, useState } from "react";
import { Reorder } from "framer-motion";

import ScheduleItemCard from "@/features/schedule/components/ScheduleItemCard";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { deriveTimeBetween } from "@/features/schedule/utils/reorder";
import type { ScheduleItem } from "@/features/schedule/types";

interface Props {
  items: ScheduleItem[];
  currentItemId: number | undefined;
  onEdit: (item: ScheduleItem) => void;
}

export default function ScheduleTimeline({ items, currentItemId, onEdit }: Props) {
  const { updateItem } = useScheduleItemStore();
  const [order, setOrder] = useState(items);

  // Re-sync when the store's own (time-sorted) list changes — e.g. after a
  // drag commits a new startTime, or any other add/edit/delete elsewhere.
  useEffect(() => {
    setOrder(items);
  }, [items]);

  function handleDragEnd(draggedId: number | undefined) {
    if (draggedId === undefined) return;

    const index = order.findIndex((item) => item.id === draggedId);
    if (index === -1) return;

    const dragged = order[index];
    const before = order[index - 1]?.startTime ?? null;
    const after = order[index + 1]?.startTime ?? null;
    const newStartTime = deriveTimeBetween(before, after);

    if (newStartTime !== dragged.startTime) {
      updateItem(dragged.id!, { ...dragged, startTime: newStartTime });
    }
  }

  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
      {order.map((item) => (
        <Reorder.Item key={item.id} value={item} onDragEnd={() => handleDragEnd(item.id)} className="cursor-grab active:cursor-grabbing">
          <ScheduleItemCard item={item} isCurrent={item.id === currentItemId} onEdit={() => onEdit(item)} />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
