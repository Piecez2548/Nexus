import { describe, expect, it } from "vitest";
import { scheduleItemSchema } from "./scheduleItemSchema";

const t = (key: string) => key;

const valid = {
  title: "Morning workout",
  icon: "dumbbell",
  color: "#ef4444",
  startTime: "07:00",
  repeat: { frequency: "daily" as const },
  enabled: true,
};

describe("scheduleItemSchema", () => {
  it("accepts a minimal valid daily item", () => {
    expect(scheduleItemSchema(t).safeParse(valid).success).toBe(true);
  });

  it("accepts a weekly item with weekdays", () => {
    const result = scheduleItemSchema(t).safeParse({
      ...valid,
      repeat: { frequency: "weekly", weekdays: [1, 3, 5] },
    });
    expect(result.success).toBe(true);
  });

  it("accepts endTime, category, notes, and reminder fields", () => {
    const result = scheduleItemSchema(t).safeParse({
      ...valid,
      endTime: "08:00",
      category: "Health",
      notes: "Bring water bottle",
      reminderEnabled: true,
      reminderOffsetMinutes: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(scheduleItemSchema(t).safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects a missing startTime", () => {
    const { startTime: _startTime, ...rest } = valid;
    expect(scheduleItemSchema(t).safeParse(rest).success).toBe(false);
  });

  it("rejects a weekly repeat with no weekdays selected", () => {
    const result = scheduleItemSchema(t).safeParse({ ...valid, repeat: { frequency: "weekly", weekdays: [] } });
    expect(result.success).toBe(false);
  });

  it("rejects a reminderOffsetMinutes value outside the allowed set", () => {
    const result = scheduleItemSchema(t).safeParse({ ...valid, reminderOffsetMinutes: 20 });
    expect(result.success).toBe(false);
  });
});
