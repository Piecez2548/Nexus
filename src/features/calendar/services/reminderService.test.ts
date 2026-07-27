import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsNativePlatform = vi.fn();
const mockSchedule = vi.fn();
const mockCancel = vi.fn();
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  },
  Weekday: { Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7 },
}));

const { scheduleReminder, cancelReminder } = await import("./reminderService");
import type { CalendarEvent } from "@/features/calendar/types";

function sample(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 1,
    title: "Meeting",
    startAt: "2026-07-15T09:00",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("reminderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermissions.mockResolvedValue({ display: "granted" });
    mockRequestPermissions.mockResolvedValue({ display: "granted" });
  });

  describe("scheduleReminder", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await scheduleReminder(sample({ reminderMinutesBefore: 15 }), "Meeting", "Starting soon");
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("skips when the event has no id yet", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await scheduleReminder(sample({ id: undefined, reminderMinutesBefore: 15 }), "Meeting", "Starting soon");
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("skips when reminderMinutesBefore is null", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await scheduleReminder(sample({ reminderMinutesBefore: null }), "Meeting", "Starting soon");
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("skips a non-recurring event whose reminder time is already in the past", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await scheduleReminder(
        sample({ startAt: "2020-01-01T09:00", reminderMinutesBefore: 15 }),
        "Meeting",
        "Starting soon"
      );
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("schedules a one-off notification for a non-recurring event", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const startAt = `${farFuture.getFullYear()}-${String(farFuture.getMonth() + 1).padStart(2, "0")}-${String(farFuture.getDate()).padStart(2, "0")}T09:00`;

      await scheduleReminder(sample({ id: 42, startAt, reminderMinutesBefore: 15 }), "Meeting", "Starting soon");

      expect(mockSchedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: 42,
            title: "Meeting",
            body: "Starting soon",
            schedule: { at: new Date(farFuture.getFullYear(), farFuture.getMonth(), farFuture.getDate(), 8, 45) },
          }),
        ],
      });
    });

    it("schedules a native daily repeat for a recurring event", async () => {
      mockIsNativePlatform.mockReturnValue(true);

      await scheduleReminder(
        sample({ id: 7, startAt: "2020-01-01T09:00", recurring: { frequency: "daily" }, reminderMinutesBefore: 15 }),
        "Meeting",
        "Starting soon"
      );

      expect(mockSchedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: 7,
            schedule: { on: { hour: 8, minute: 45 } },
          }),
        ],
      });
    });

    it("does not schedule when permission is denied", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: "denied" });
      mockRequestPermissions.mockResolvedValue({ display: "denied" });

      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const startAt = `${farFuture.getFullYear()}-${String(farFuture.getMonth() + 1).padStart(2, "0")}-${String(farFuture.getDate()).padStart(2, "0")}T09:00`;

      await scheduleReminder(sample({ startAt, reminderMinutesBefore: 0 }), "Meeting", "Starting now");
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe("cancelReminder", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await cancelReminder(5);
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it("cancels the notification with the given id when native", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await cancelReminder(5);
      expect(mockCancel).toHaveBeenCalledWith({ notifications: [{ id: 5 }] });
    });
  });
});
