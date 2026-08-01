// The Calendar feature's UI (pages, components, store, service,
// repository, schema, recurrence utils) was retired in favor of Life
// Schedule (src/features/schedule/) — a daily-routine timeline, not a
// dated-event calendar. This type is the one thing that survives: the
// `calendarEvents` Dexie table and its existing rows are deliberately kept
// untouched (never migrated, never deleted) so a user's prior data isn't
// lost, and db.ts still needs this type for that table's declaration.
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
