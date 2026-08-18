import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsNativePlatform = vi.fn();
const mockSchedule = vi.fn();
const mockCancel = vi.fn();
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();
const mockCreateChannel = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
    createChannel: (...args: unknown[]) => mockCreateChannel(...args),
  },
  Weekday: { Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7 },
}));

const { scheduleReminder, cancelReminder } = await import("./nativeReminderService");
import { REMINDER_NAMESPACE } from "@/features/reminders/types";

describe("nativeReminderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermissions.mockResolvedValue({ display: "granted" });
    mockRequestPermissions.mockResolvedValue({ display: "granted" });
  });

  describe("scheduleReminder", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.habit,
        entityId: 1,
        title: "Exercise",
        body: "Time to exercise",
        time: "06:00",
        repeat: { frequency: "daily" },
      });
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("schedules a single daily notification", async () => {
      mockIsNativePlatform.mockReturnValue(true);

      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.habit,
        entityId: 1,
        title: "Exercise",
        body: "Time to exercise",
        time: "06:30",
        repeat: { frequency: "daily" },
      });

      expect(mockSchedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: REMINDER_NAMESPACE.habit * 100_000_000 + 1 * 10 + 0,
            title: "Exercise",
            body: "Time to exercise",
            channelId: "nexus-reminders",
            schedule: { on: { hour: 6, minute: 30 } },
          }),
        ],
      });
    });

    it("fans out a weekly repeat into one notification per selected weekday", async () => {
      mockIsNativePlatform.mockReturnValue(true);

      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.schedule,
        entityId: 7,
        title: "Workout",
        body: "Time for the workout block",
        time: "17:30",
        repeat: { frequency: "weekly", weekdays: [1, 3, 5] }, // Mon, Wed, Fri
      });

      expect(mockSchedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: REMINDER_NAMESPACE.schedule * 100_000_000 + 7 * 10 + 1,
            schedule: { on: { weekday: 2, hour: 17, minute: 30 } }, // JS Mon=1 -> plugin Weekday=2
          }),
          expect.objectContaining({
            id: REMINDER_NAMESPACE.schedule * 100_000_000 + 7 * 10 + 3,
            schedule: { on: { weekday: 4, hour: 17, minute: 30 } },
          }),
          expect.objectContaining({
            id: REMINDER_NAMESPACE.schedule * 100_000_000 + 7 * 10 + 5,
            schedule: { on: { weekday: 6, hour: 17, minute: 30 } },
          }),
        ],
      });
    });

    it("schedules a one-off notification at a specific date/time for a 'once' repeat", async () => {
      mockIsNativePlatform.mockReturnValue(true);

      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.subscription,
        entityId: 5,
        title: "Netflix",
        body: "Netflix bills tomorrow",
        repeat: { frequency: "once", at: "2026-08-19T09:00:00.000Z" },
      });

      expect(mockSchedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: REMINDER_NAMESPACE.subscription * 100_000_000 + 5 * 10 + 0,
            title: "Netflix",
            schedule: { at: new Date("2026-08-19T09:00:00.000Z") },
          }),
        ],
      });
    });

    it("creates a max-importance, vibrating reminder channel before scheduling", async () => {
      mockIsNativePlatform.mockReturnValue(true);

      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.habit,
        entityId: 1,
        title: "Exercise",
        body: "Time to exercise",
        time: "06:00",
        repeat: { frequency: "daily" },
      });

      expect(mockCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({ id: "nexus-reminders", importance: 5, vibration: true })
      );
    });

    it("does not schedule when permission is denied", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: "denied" });
      mockRequestPermissions.mockResolvedValue({ display: "denied" });

      await scheduleReminder({
        namespace: REMINDER_NAMESPACE.habit,
        entityId: 1,
        title: "Exercise",
        body: "Time to exercise",
        time: "06:00",
        repeat: { frequency: "daily" },
      });

      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe("cancelReminder", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await cancelReminder(REMINDER_NAMESPACE.habit, 1);
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it("cancels all 7 possible weekday slots for the given namespace+entity", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await cancelReminder(REMINDER_NAMESPACE.schedule, 7);

      expect(mockCancel).toHaveBeenCalledWith({
        notifications: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          id: REMINDER_NAMESPACE.schedule * 100_000_000 + 7 * 10 + weekday,
        })),
      });
    });
  });
});
