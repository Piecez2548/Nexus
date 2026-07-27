import { calendarEventRepository } from "@/features/calendar/repositories/calendarEventRepository";
import type { CalendarEvent } from "../types";

export const calendarEventService = {
  list: () => calendarEventRepository.getAll(),

  create: (event: CalendarEvent) => calendarEventRepository.add(event),

  update: (id: number, event: CalendarEvent) =>
    calendarEventRepository.update(id, event),

  remove: (id: number) => calendarEventRepository.remove(id),
};
