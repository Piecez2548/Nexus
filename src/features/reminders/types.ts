// JS Date#getDay(): 0=Sunday..6=Saturday.
export type RepeatRule = { frequency: "daily" } | { frequency: "weekly"; weekdays: number[] };

// Distinguishes which feature a reminder belongs to when deriving a native
// notification id — habit ids and schedule-item ids are independent Dexie
// auto-increments that can both be e.g. 5, so a raw id alone isn't enough
// to avoid one feature's reminder silently clobbering the other's.
export const REMINDER_NAMESPACE = { habit: 1, schedule: 2 } as const;
export type ReminderNamespace = (typeof REMINDER_NAMESPACE)[keyof typeof REMINDER_NAMESPACE];

export interface ReminderRequest {
  namespace: ReminderNamespace;
  entityId: number;
  title: string;
  body: string;
  // "HH:mm", local wall-clock — never a Date, since a habit/schedule-item
  // reminder has no specific date to begin with, only a time of day.
  time: string;
  repeat: RepeatRule;
}
