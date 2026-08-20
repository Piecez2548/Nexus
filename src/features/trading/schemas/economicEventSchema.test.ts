import { describe, expect, it } from "vitest";
import { economicEventSchema } from "./economicEventSchema";

const t = (key: string) => key;

const validEvent = {
  title: "FOMC Meeting",
  eventDate: "2026-09-18",
  eventTime: "14:00",
  impact: "high",
  notes: "Rate decision",
};

describe("economicEventSchema", () => {
  it("accepts a fully-filled event", () => {
    expect(economicEventSchema(t).safeParse(validEvent).success).toBe(true);
  });

  it("accepts an event with only a title and date", () => {
    expect(economicEventSchema(t).safeParse({ title: "FOMC Meeting", eventDate: "2026-09-18" }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = economicEventSchema(t).safeParse({ ...validEvent, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty event date", () => {
    const result = economicEventSchema(t).safeParse({ ...validEvent, eventDate: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid impact value", () => {
    const result = economicEventSchema(t).safeParse({ ...validEvent, impact: "extreme" });
    expect(result.success).toBe(false);
  });
});
