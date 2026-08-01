import type { SyncMeta } from "@/utils/syncMeta";
import type { RepeatRule } from "@/features/reminders/types";

export type ScheduleReminderOffsetMinutes = 0 | 5 | 10 | 15 | 30;

export interface ScheduleItem extends SyncMeta {
  id?: number;
  title: string;
  // Key into constants/icons.ts's ICONS map.
  icon: string;
  // Hex color, <input type="color">.
  color: string;
  // "HH:mm", local wall-clock — never a specific date.
  startTime: string;
  endTime?: string;
  // Free text, not a managed entity — the item's own icon/color already
  // provide visual grouping, so a whole second Category CRUD system would
  // be more machinery than a personal routine list needs.
  category?: string;
  notes?: string;
  // Always present — unlike Calendar's optional `recurring`, every
  // schedule item is inherently recurring (it's a daily routine, not a
  // dated event).
  repeat: RepeatRule;
  // Pause without deleting.
  enabled: boolean;
  reminderEnabled?: boolean;
  // Minutes before startTime; fires on the same `repeat` as the item
  // itself — a schedule item's reminder can never drift from when the
  // item is actually active, unlike a habit's independently-configurable
  // reminder schedule.
  reminderOffsetMinutes?: ScheduleReminderOffsetMinutes | null;
  createdAt: string;
}
