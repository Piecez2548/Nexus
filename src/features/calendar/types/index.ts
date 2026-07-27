import type { SyncMeta } from "@/utils/syncMeta";

export type CalendarRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarRecurrence {
  frequency: CalendarRecurrenceFrequency;
}

export type ReminderMinutesBefore = 0 | 15 | 60 | 1440;

export interface CalendarEvent extends SyncMeta {
  id?: number;
  title: string;
  notes?: string;
  location?: string;
  // "YYYY-MM-DDTHH:mm", local — never UTC, never `new Date(str)` directly.
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  recurring?: CalendarRecurrence | null;
  reminderMinutesBefore?: ReminderMinutesBefore | null;
  createdAt: string;
}
