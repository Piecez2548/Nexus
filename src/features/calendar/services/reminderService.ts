import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday, type ScheduleOn } from "@capacitor/local-notifications";

import { getNextOccurrence } from "@/features/calendar/utils/recurrence";
import type { CalendarEvent } from "@/features/calendar/types";

// Maps JS's Date.getDay() (0=Sunday..6=Saturday) to the plugin's Weekday
// enum (1=Sunday..7=Saturday).
function toPluginWeekday(jsDay: number): Weekday {
  return (jsDay + 1) as Weekday;
}

// Every recurrence frequency uses the OS's own native repeat schedule
// (`on`, cron-like — omitted fields act as wildcards) rather than app-side
// rescheduling, so a recurring reminder keeps firing even if the app isn't
// reopened for days. Accepted tradeoff: a monthly/yearly reminder anchored
// on the 29th-31st simply won't fire in a shorter month (native `on:{day}`
// has no month-length awareness, unlike getOccurrencesInRange's clamped
// display logic) — the same quirk many mainstream calendar apps have.
function buildSchedule(event: CalendarEvent, fireAt: Date): { at: Date } | { on: ScheduleOn } {
  if (!event.recurring) return { at: fireAt };

  const hour = fireAt.getHours();
  const minute = fireAt.getMinutes();

  switch (event.recurring.frequency) {
    case "daily":
      return { on: { hour, minute } };
    case "weekly":
      return { on: { weekday: toPluginWeekday(fireAt.getDay()), hour, minute } };
    case "monthly":
      return { on: { day: fireAt.getDate(), hour, minute } };
    case "yearly":
      return { on: { month: fireAt.getMonth() + 1, day: fireAt.getDate(), hour, minute } };
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

// Schedules (or reschedules) a reminder for `event`. Gated on
// isNativePlatform() even though the plugin has a genuine web fallback
// (backed by the browser Notification API) — a web notification doesn't
// survive tab close anyway, which is inconsistent with what "fires even
// when closed" means here, and gating avoids real unmocked OS permission
// prompts during `vite dev`/Playwright E2E.
export async function scheduleReminder(
  event: CalendarEvent,
  title: string,
  body: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (event.id === undefined) return;
  if (event.reminderMinutesBefore == null) return;

  const nextOccurrence = getNextOccurrence(event);
  if (nextOccurrence === null) return;

  const fireAt = new Date(nextOccurrence);
  fireAt.setMinutes(fireAt.getMinutes() - event.reminderMinutesBefore);

  if (!event.recurring && fireAt.getTime() <= Date.now()) return;

  const granted = await ensurePermission();
  if (!granted) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: event.id,
        title,
        body,
        schedule: buildSchedule(event, fireAt),
      },
    ],
  });
}

export async function cancelReminder(eventId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: eventId }] });
}
