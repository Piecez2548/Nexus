import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday, type ScheduleOn } from "@capacitor/local-notifications";

import { translate } from "@/i18n/useTranslation";
import type { ReminderNamespace, ReminderRequest, RepeatRule } from "@/features/reminders/types";

// A dedicated, max-importance channel (separate from the OS default) so a
// reminder shows as a heads-up banner and reliably vibrates/plays sound
// instead of quietly landing in the notification shade. Android channel
// settings are immutable after first creation, so this only takes effect
// for reminders scheduled after this channel first exists. Safe to call on
// every schedule: creating an already-existing channel id is a no-op.
const REMINDER_CHANNEL_ID = "nexus-reminders";

async function ensureReminderChannel(): Promise<void> {
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: translate("reminders.channelName"),
    description: translate("reminders.channelDescription"),
    importance: 5,
    visibility: 1,
    vibration: true,
  });
}

// Maps JS's Date.getDay() (0=Sunday..6=Saturday) to the plugin's Weekday
// enum (1=Sunday..7=Saturday).
function toPluginWeekday(jsDay: number): Weekday {
  return (jsDay + 1) as Weekday;
}

// Derives a collision-free native notification id. Habit ids and
// schedule-item ids are independent Dexie auto-increments that can
// legitimately share the same raw number — the namespace disambiguates
// which feature owns the notification, and weekday disambiguates each
// fanned-out sub-notification of a multi-weekday repeat (0 for the
// daily/non-weekday case).
function toNotificationId(namespace: ReminderNamespace, entityId: number, weekday: number): number {
  return namespace * 100_000_000 + entityId * 10 + weekday;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

// The native LocalNotifications plugin only supports one `on:{weekday,...}`
// schedule per notification id, so a multi-weekday repeat can't be
// expressed as a single native schedule — the caller fans out into one
// notification per weekday instead (see scheduleReminder). A "once" repeat
// uses the plugin's separate one-off `at: Date` form instead of `on:`, and
// carries its own full date/time in repeat.at rather than the request's
// (unused, in that case) `time` field.
function buildSchedule(repeat: RepeatRule, weekday: number, time: string | undefined): { on: ScheduleOn } | { at: Date } {
  if (repeat.frequency === "once") return { at: new Date(repeat.at) };

  const { hour, minute } = parseTime(time!);
  if (repeat.frequency === "daily") return { on: { hour, minute } };
  return { on: { weekday: toPluginWeekday(weekday), hour, minute } };
}

async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

// Schedules (or reschedules) a reminder. Gated on isNativePlatform() —
// avoids real unmocked OS permission prompts during `vite dev`/Playwright
// E2E, and a web notification wouldn't survive tab close anyway, which is
// inconsistent with what a recurring reminder means here.
export async function scheduleReminder(request: ReminderRequest): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const granted = await ensurePermission();
  if (!granted) return;

  await ensureReminderChannel();

  const weekdays = request.repeat.frequency === "weekly" ? request.repeat.weekdays : [0];

  await LocalNotifications.schedule({
    notifications: weekdays.map((weekday) => ({
      id: toNotificationId(request.namespace, request.entityId, weekday),
      title: request.title,
      body: request.body,
      channelId: REMINDER_CHANNEL_ID,
      schedule: buildSchedule(request.repeat, weekday, request.time),
    })),
  });
}

// Cancels every possible weekday slot (0-6) unconditionally rather than
// tracking what was previously scheduled — canceling a nonexistent id is
// already a harmless no-op, so this stays simple and idempotent regardless
// of whether the entity's repeat was daily or a specific weekday subset.
export async function cancelReminder(namespace: ReminderNamespace, entityId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.cancel({
    notifications: Array.from({ length: 7 }, (_, weekday) => ({
      id: toNotificationId(namespace, entityId, weekday),
    })),
  });
}
