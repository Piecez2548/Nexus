import { describe, expect, it } from "vitest";
import { habitSchema } from "./habitSchema";

const valid = { name: "ออกกำลังกาย", frequency: "daily" };

describe("habitSchema", () => {
  it("accepts a valid daily habit", () => {
    expect(habitSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid weekly habit", () => {
    expect(habitSchema.safeParse({ ...valid, frequency: "weekly" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(habitSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects an invalid frequency value", () => {
    expect(habitSchema.safeParse({ ...valid, frequency: "monthly" }).success).toBe(false);
  });
});
