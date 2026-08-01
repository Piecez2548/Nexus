import { describe, expect, it } from "vitest";
import { categorySchema } from "./categorySchema";

const t = (key: string) => key;

const validCategory = {
  name: "Food",
  type: "expense" as const,
  icon: "utensils",
  color: "#ef4444",
};

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    expect(categorySchema(t).safeParse(validCategory).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = categorySchema(t).safeParse({ ...validCategory, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = categorySchema(t).safeParse({ ...validCategory, type: "transfer" });
    expect(result.success).toBe(false);
  });
});
