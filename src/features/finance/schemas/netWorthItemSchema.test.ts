import { describe, expect, it } from "vitest";
import { netWorthItemSchema } from "./netWorthItemSchema";

const t = (key: string) => key;

const validAsset = { kind: "asset", name: "House", category: "property", value: 3000000, icon: "house", color: "#16a34a" };
const validLiability = { kind: "liability", name: "Mortgage", category: "mortgage", value: 1500000, icon: "house", color: "#dc2626" };

describe("netWorthItemSchema", () => {
  it("accepts a valid asset", () => {
    expect(netWorthItemSchema(t).safeParse(validAsset).success).toBe(true);
  });

  it("accepts a valid liability", () => {
    expect(netWorthItemSchema(t).safeParse(validLiability).success).toBe(true);
  });

  it("accepts a zero value (e.g. a fully paid-off liability, or a freshly-tracked asset)", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, value: 0 }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, name: "" }).success).toBe(false);
  });

  it("rejects a negative value", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, value: -100 }).success).toBe(false);
  });

  it("rejects a category not in the known asset/liability set", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, category: "not-a-real-category" }).success).toBe(false);
  });

  it("rejects a kind that isn't asset or liability", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, kind: "something-else" }).success).toBe(false);
  });

  it("accepts an optional note", () => {
    expect(netWorthItemSchema(t).safeParse({ ...validAsset, note: "Bought in 2020" }).success).toBe(true);
  });
});
