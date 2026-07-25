import { describe, expect, it } from "vitest";
import { categorySchema } from "./categorySchema";

const validCategory = {
  name: "Food",
  type: "expense" as const,
  icon: "utensils",
  color: "#ef4444",
};

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    expect(categorySchema.safeParse(validCategory).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = categorySchema.safeParse({ ...validCategory, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = categorySchema.safeParse({ ...validCategory, type: "transfer" });
    expect(result.success).toBe(false);
  });
});
