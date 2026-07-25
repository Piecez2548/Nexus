import { describe, expect, it } from "vitest";
import { goalSchema } from "./goalSchema";

const valid = { name: "รถใหม่", targetAmount: 500000, currentAmount: 0 };

describe("goalSchema", () => {
  it("accepts a valid goal", () => {
    expect(goalSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(goalSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects a non-positive target amount", () => {
    expect(goalSchema.safeParse({ ...valid, targetAmount: 0 }).success).toBe(false);
  });

  it("rejects a negative current amount", () => {
    expect(goalSchema.safeParse({ ...valid, currentAmount: -1 }).success).toBe(false);
  });

  it("accepts an optional deadline", () => {
    expect(goalSchema.safeParse({ ...valid, deadline: "2027-01-01" }).success).toBe(true);
  });
});
