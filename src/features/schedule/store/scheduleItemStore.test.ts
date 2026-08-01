import { describe, expect, it, vi, beforeEach } from "vitest";

const mockScheduleReminder = vi.fn();
const mockCancelReminder = vi.fn();

vi.mock("@/features/reminders/services/nativeReminderService", () => ({
  scheduleReminder: (...args: unknown[]) => mockScheduleReminder(...args),
  cancelReminder: (...args: unknown[]) => mockCancelReminder(...args),
}));

const { useScheduleItemStore } = await import("./scheduleItemStore");
const { db } = await import("@/database/db");
const { REMINDER_NAMESPACE } = await import("@/features/reminders/types");
import type { ScheduleItem } from "@/features/schedule/types";

// A factory, not a shared const — Dexie's `table.add()` mutates its input
// object by stamping the generated `id` back onto it.
function sample(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    title: "Morning workout",
    icon: "dumbbell",
    color: "#ef4444",
    startTime: "07:00",
    repeat: { frequency: "daily" },
    enabled: true,
    reminderEnabled: true,
    reminderOffsetMinutes: 10,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scheduleItemStore", () => {
  beforeEach(async () => {
    await db.scheduleItems.clear();
    useScheduleItemStore.setState({ items: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it("loads items from the database", async () => {
    await db.scheduleItems.add(sample());

    await useScheduleItemStore.getState().loadItems();

    expect(useScheduleItemStore.getState().items).toHaveLength(1);
  });

  it("adds an item and schedules its reminder, offset before startTime", async () => {
    await useScheduleItemStore.getState().addItem(sample());

    expect(useScheduleItemStore.getState().items).toHaveLength(1);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [request] = mockScheduleReminder.mock.calls[0];
    expect(request.namespace).toBe(REMINDER_NAMESPACE.schedule);
    expect(request.time).toBe("06:50"); // 10 minutes before 07:00
  });

  it("does not schedule a reminder for a disabled item", async () => {
    await useScheduleItemStore.getState().addItem(sample({ enabled: false }));
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("cancels then reschedules the reminder on update", async () => {
    const id = await db.scheduleItems.add(sample());
    useScheduleItemStore.setState({ items: [sample({ id })] });

    await useScheduleItemStore.getState().updateItem(id, sample({ startTime: "08:00" }));

    expect(mockCancelReminder).toHaveBeenCalledWith(REMINDER_NAMESPACE.schedule, id);
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);
    const [request] = mockScheduleReminder.mock.calls[0];
    expect(request.time).toBe("07:50");
  });

  it("cancels the reminder and removes the item on delete", async () => {
    const id = await db.scheduleItems.add(sample());
    useScheduleItemStore.setState({ items: [sample({ id })] });

    await useScheduleItemStore.getState().deleteItem(id);

    expect(mockCancelReminder).toHaveBeenCalledWith(REMINDER_NAMESPACE.schedule, id);
    expect(useScheduleItemStore.getState().items).toHaveLength(0);
  });
});
