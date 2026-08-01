import { describe, expect, it } from "vitest";
import { budgetSchema } from "./budgetSchema";

const t = (key: string) => key;

const valid = { category: "Food", amount: 1000, period: "monthly" as const };

describe("budgetSchema", () => {
  it("accepts a valid budget", () => {
    expect(budgetSchema(t).safeParse(valid).success).toBe(true);
  });

  it("rejects an empty category", () => {
    expect(budgetSchema(t).safeParse({ ...valid, category: "" }).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(budgetSchema(t).safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects an unknown period", () => {
    expect(budgetSchema(t).safeParse({ ...valid, period: "daily" }).success).toBe(false);
  });
});
