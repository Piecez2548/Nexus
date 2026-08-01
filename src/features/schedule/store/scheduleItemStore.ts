import { create } from "zustand";
import { scheduleItemService } from "@/features/schedule/services/scheduleItemService";
import { subtractMinutes } from "@/features/schedule/utils/time";
import { scheduleReminder, cancelReminder } from "@/features/reminders/services/nativeReminderService";
import { REMINDER_NAMESPACE } from "@/features/reminders/types";
import { translate } from "@/i18n/useTranslation";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { ScheduleItem } from "@/features/schedule/types";

interface ScheduleItemState {
  items: ScheduleItem[];
  loading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: ScheduleItem) => Promise<void>;
  updateItem: (id: number, item: ScheduleItem) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

async function reminderFor(item: ScheduleItem) {
  if (!item.enabled || !item.reminderEnabled || item.reminderOffsetMinutes == null) return;

  await scheduleReminder({
    namespace: REMINDER_NAMESPACE.schedule,
    entityId: item.id!,
    title: item.title,
    body: translate("schedule.reminderNotificationBody", { title: item.title }),
    time: subtractMinutes(item.startTime, item.reminderOffsetMinutes),
    repeat: item.repeat,
  });
}

export const useScheduleItemStore =
  create<ScheduleItemState>((set) => ({
    items: [],
    ...initialAsyncState,

    loadItems: async () => {
      set({ loading: true, error: null });

      try {
        const items = await scheduleItemService.list();
        set({ items, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addItem(item) {
      const id = await scheduleItemService.create(item);
      await reminderFor({ ...item, id });

      const items = await scheduleItemService.list();
      set({ items });
    },

    async updateItem(id, item) {
      // Always cancel first, then reschedule if still enabled — simpler
      // and safer than diffing old vs. new reminder settings.
      await cancelReminder(REMINDER_NAMESPACE.schedule, id);
      await scheduleItemService.update(id, item);
      await reminderFor({ ...item, id });

      const items = await scheduleItemService.list();
      set({ items });
    },

    async deleteItem(id) {
      await cancelReminder(REMINDER_NAMESPACE.schedule, id);
      await scheduleItemService.remove(id);

      const items = await scheduleItemService.list();
      set({ items });
    },
  }));
