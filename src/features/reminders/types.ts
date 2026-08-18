// JS Date#getDay(): 0=Sunday..6=Saturday. Habit/ScheduleItem only ever
// construct a recurring rule (their own repeatRuleSchema.ts has no "once"
// branch), so their entity fields use this narrower alias -- keeps their
// own form/schema types precise instead of widening to include a variant
// they can never actually produce.
export type RecurringRepeatRule = { frequency: "daily" } | { frequency: "weekly"; weekdays: number[] };

// The full set nativeReminderService.ts's ReminderRequest accepts. "once" is
// a single, non-repeating fire at a specific date/time -- added for
// Subscription reminders, which are tied to one upcoming billing date
// rather than an indefinite daily/weekly pattern.
export type RepeatRule = RecurringRepeatRule | { frequency: "once"; at: string };

// Distinguishes which feature a reminder belongs to when deriving a native
// notification id — habit ids, schedule-item ids, and subscription ids are
// independent Dexie auto-increments that can all be e.g. 5, so a raw id
// alone isn't enough to avoid one feature's reminder silently clobbering
// another's.
export const REMINDER_NAMESPACE = { habit: 1, schedule: 2, subscription: 3 } as const;
export type ReminderNamespace = (typeof REMINDER_NAMESPACE)[keyof typeof REMINDER_NAMESPACE];

export interface ReminderRequest {
  namespace: ReminderNamespace;
  entityId: number;
  title: string;
  body: string;
  // "HH:mm", local wall-clock — never a Date, since a habit/schedule-item
  // reminder has no specific date to begin with, only a time of day.
  // Unused (and omittable) for a "once" repeat, whose full date+time
  // already lives in repeat.at.
  time?: string;
  repeat: RepeatRule;
}
