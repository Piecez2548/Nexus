import { describe, expect, it, vi, beforeEach } from "vitest";

const mockScheduleReminder = vi.fn();
const mockCancelReminder = vi.fn();

vi.mock("@/features/reminders/services/nativeReminderService", () => ({
  scheduleReminder: (...args: unknown[]) => mockScheduleReminder(...args),
  cancelReminder: (...args: unknown[]) => mockCancelReminder(...args),
}));

const { useHabitStore } = await import("./habitStore");
const { db } = await import("@/database/db");
const { REMINDER_NAMESPACE } = await import("@/features/reminders/types");
import type { Habit } from "@/features/habits/types";

// A factory, not a shared const — Dexie's `table.add()` mutates its input
// object by stamping the generated `id` back onto it.
function sample(overrides: Partial<Habit> = {}): Habit {
  return {
    name: "Exercise",
    frequency: "daily",
    completedDates: [],
    reminderEnabled: true,
    reminderTime: "06:00",
    reminderRepeat: { frequency: "daily" },
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("habitStore reminders", () => {
  beforeEach(async () => {
    await db.habits.clear();
    useHabitStore.setState({ habits: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it("adds a habit and schedules its reminder with the new id", async () => {
    await useHabitStore.getState().addHabit(sample());

    expect(useHabitStore.getState().habits).toHaveLength(1);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [request] = mockScheduleReminder.mock.calls[0];
    expect(request.entityId).toBeDefined();
    expect(request.namespace).toBe(REMINDER_NAMESPACE.habit);
    expect(request.title).toBe("Exercise");
    expect(request.time).toBe("06:00");
  });

  it("does not schedule a reminder when disabled", async () => {
    await useHabitStore.getState().addHabit(sample({ reminderEnabled: false }));
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("cancels then reschedules the reminder on update", async () => {
    const id = await db.habits.add(sample());
    useHabitStore.setState({ habits: [sample({ id })] });

    await useHabitStore.getState().updateHabit(id, sample({ reminderTime: "07:00" }));

    expect(mockCancelReminder).toHaveBeenCalledWith(REMINDER_NAMESPACE.habit, id);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [request] = mockScheduleReminder.mock.calls[0];
    expect(request.time).toBe("07:00");
  });

  it("cancels the reminder and removes the habit on delete", async () => {
    const id = await db.habits.add(sample());
    useHabitStore.setState({ habits: [sample({ id })] });

    await useHabitStore.getState().deleteHabit(id);

    expect(mockCancelReminder).toHaveBeenCalledWith(REMINDER_NAMESPACE.habit, id);
    expect(useHabitStore.getState().habits).toHaveLength(0);
  });
});
