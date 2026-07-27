import { describe, expect, it, vi, beforeEach } from "vitest";

const mockScheduleReminder = vi.fn();
const mockCancelReminder = vi.fn();

vi.mock("@/features/calendar/services/reminderService", () => ({
  scheduleReminder: (...args: unknown[]) => mockScheduleReminder(...args),
  cancelReminder: (...args: unknown[]) => mockCancelReminder(...args),
}));

const { useCalendarEventStore } = await import("./calendarEventStore");
const { db } = await import("@/database/db");
import type { CalendarEvent } from "@/features/calendar/types";

// A factory, not a shared const — Dexie's `table.add()` mutates its input
// object by stamping the generated `id` back onto it.
function sample(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    title: "Team meeting",
    startAt: "2026-07-15T09:00",
    reminderMinutesBefore: 15,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calendarEventStore", () => {
  beforeEach(async () => {
    await db.calendarEvents.clear();
    useCalendarEventStore.setState({ events: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it("loads events from the database", async () => {
    await db.calendarEvents.add(sample());

    await useCalendarEventStore.getState().loadEvents();

    expect(useCalendarEventStore.getState().events).toHaveLength(1);
  });

  it("adds an event and schedules its reminder with the new id", async () => {
    await useCalendarEventStore.getState().addEvent(sample());

    expect(useCalendarEventStore.getState().events).toHaveLength(1);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [scheduledEvent] = mockScheduleReminder.mock.calls[0];
    expect(scheduledEvent.id).toBeDefined();
    expect(scheduledEvent.title).toBe("Team meeting");
  });

  it("cancels then reschedules the reminder on update", async () => {
    const id = await db.calendarEvents.add(sample());
    useCalendarEventStore.setState({ events: [sample({ id })] });

    await useCalendarEventStore.getState().updateEvent(id, sample({ title: "Updated meeting" }));

    expect(mockCancelReminder).toHaveBeenCalledWith(id);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [scheduledEvent] = mockScheduleReminder.mock.calls[0];
    expect(scheduledEvent.title).toBe("Updated meeting");

    const [event] = useCalendarEventStore.getState().events;
    expect(event.title).toBe("Updated meeting");
  });

  it("cancels the reminder and removes the event on delete", async () => {
    const id = await db.calendarEvents.add(sample());
    useCalendarEventStore.setState({ events: [sample({ id })] });

    await useCalendarEventStore.getState().deleteEvent(id);

    expect(mockCancelReminder).toHaveBeenCalledWith(id);
    expect(useCalendarEventStore.getState().events).toHaveLength(0);
  });
});
