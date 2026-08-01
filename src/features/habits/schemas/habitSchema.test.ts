import { describe, expect, it } from "vitest";
import { habitSchema } from "./habitSchema";

const t = (key: string) => key;

const valid = { name: "ออกกำลังกาย", frequency: "daily" };

describe("habitSchema", () => {
  it("accepts a valid daily habit", () => {
    expect(habitSchema(t).safeParse(valid).success).toBe(true);
  });

  it("accepts a valid weekly habit", () => {
    expect(habitSchema(t).safeParse({ ...valid, frequency: "weekly" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(habitSchema(t).safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects an invalid frequency value", () => {
    expect(habitSchema(t).safeParse({ ...valid, frequency: "monthly" }).success).toBe(false);
  });
});
