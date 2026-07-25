import { describe, expect, it } from "vitest";
import { budgetSchema } from "./budgetSchema";

const valid = { category: "Food", amount: 1000, period: "monthly" as const };

describe("budgetSchema", () => {
  it("accepts a valid budget", () => {
    expect(budgetSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty category", () => {
    expect(budgetSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(budgetSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects an unknown period", () => {
    expect(budgetSchema.safeParse({ ...valid, period: "daily" }).success).toBe(false);
  });
});
