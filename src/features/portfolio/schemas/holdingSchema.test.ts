import { describe, expect, it } from "vitest";
import { holdingSchema } from "./holdingSchema";

const t = (key: string) => key;

const valid = { symbol: "AAPL", market: "stocks", quantity: 10, avgCostPrice: 100 };

describe("holdingSchema", () => {
  it("accepts a valid holding", () => {
    expect(holdingSchema(t).safeParse(valid).success).toBe(true);
  });

  it("rejects an empty symbol", () => {
    expect(holdingSchema(t).safeParse({ ...valid, symbol: "" }).success).toBe(false);
  });

  it("rejects an invalid market value", () => {
    expect(holdingSchema(t).safeParse({ ...valid, market: "not-a-market" }).success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    expect(holdingSchema(t).safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it("accepts a zero average cost price (a gifted/zero-cost position)", () => {
    expect(holdingSchema(t).safeParse({ ...valid, avgCostPrice: 0 }).success).toBe(true);
  });

  it("rejects a negative average cost price", () => {
    expect(holdingSchema(t).safeParse({ ...valid, avgCostPrice: -1 }).success).toBe(false);
  });

  it("accepts an optional notes field", () => {
    expect(holdingSchema(t).safeParse({ ...valid, notes: "Long-term hold" }).success).toBe(true);
  });
});
