import { describe, expect, it } from "vitest";
import { calendarEventSchema } from "./calendarEventSchema";

const valid = { title: "Meeting", startAt: "2026-07-15T09:00" };

describe("calendarEventSchema", () => {
  it("accepts a minimal valid event", () => {
    expect(calendarEventSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts notes, location, endAt, allDay, recurring, and reminderMinutesBefore", () => {
    const result = calendarEventSchema.safeParse({
      ...valid,
      notes: "Bring laptop",
      location: "Office",
      endAt: "2026-07-15T10:00",
      allDay: false,
      recurring: { frequency: "weekly" },
      reminderMinutesBefore: 15,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null recurring and reminderMinutesBefore", () => {
    const result = calendarEventSchema.safeParse({ ...valid, recurring: null, reminderMinutesBefore: null });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(calendarEventSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects a missing startAt", () => {
    expect(calendarEventSchema.safeParse({ title: "Meeting" }).success).toBe(false);
  });

  it("rejects an invalid recurring frequency", () => {
    const result = calendarEventSchema.safeParse({ ...valid, recurring: { frequency: "hourly" } });
    expect(result.success).toBe(false);
  });

  it("rejects a reminderMinutesBefore value outside the allowed set", () => {
    const result = calendarEventSchema.safeParse({ ...valid, reminderMinutesBefore: 30 });
    expect(result.success).toBe(false);
  });
});
