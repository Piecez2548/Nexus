import { describe, expect, it } from "vitest";
import { watchlistSchema } from "./watchlistSchema";

const t = (key: string) => key;

const validItem = {
  symbol: "AAPL",
  market: "stocks",
  targetPrice: 200,
  notes: "Buy on pullback",
};

describe("watchlistSchema", () => {
  it("accepts a fully-filled watchlist item", () => {
    expect(watchlistSchema(t).safeParse(validItem).success).toBe(true);
  });

  it("accepts an item with no target price or notes", () => {
    expect(watchlistSchema(t).safeParse({ symbol: "AAPL", market: "stocks" }).success).toBe(true);
  });

  it("rejects an empty symbol", () => {
    const result = watchlistSchema(t).safeParse({ ...validItem, symbol: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing market", () => {
    const { market: _market, ...rest } = validItem;
    const result = watchlistSchema(t).safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a negative target price", () => {
    const result = watchlistSchema(t).safeParse({ ...validItem, targetPrice: -10 });
    expect(result.success).toBe(false);
  });
});
