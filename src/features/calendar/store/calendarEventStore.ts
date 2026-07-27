import { create } from "zustand";
import { calendarEventService } from "@/features/calendar/services/calendarEventService";
import { scheduleReminder, cancelReminder } from "@/features/calendar/services/reminderService";
import { translate } from "@/i18n/useTranslation";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { CalendarEvent } from "@/features/calendar/types";

interface CalendarEventState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  loadEvents: () => Promise<void>;
  addEvent: (event: CalendarEvent) => Promise<void>;
  updateEvent: (id: number, event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
}

async function reminderFor(event: CalendarEvent) {
  await scheduleReminder(event, event.title, translate("calendar.reminderNotificationBody"));
}

export const useCalendarEventStore =
  create<CalendarEventState>((set) => ({
    events: [],
    ...initialAsyncState,

    loadEvents: async () => {
      set({ loading: true, error: null });

      try {
        const events = await calendarEventService.list();
        set({ events, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addEvent(event) {
      const id = await calendarEventService.create(event);
      await reminderFor({ ...event, id });

      const events = await calendarEventService.list();
      set({ events });
    },

    async updateEvent(id, event) {
      // Always cancel first, then reschedule if still set — simpler and
      // safer than diffing old vs. new reminder settings.
      await cancelReminder(id);
      await calendarEventService.update(id, event);
      await reminderFor({ ...event, id });

      const events = await calendarEventService.list();
      set({ events });
    },

    async deleteEvent(id) {
      await cancelReminder(id);
      await calendarEventService.remove(id);

      const events = await calendarEventService.list();
      set({ events });
    },
  }));
