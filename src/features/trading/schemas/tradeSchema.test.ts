import { describe, expect, it } from "vitest";
import { tradeSchema } from "./tradeSchema";

const validOpenTrade = {
  symbol: "AAPL",
  market: "stocks" as const,
  direction: "long" as const,
  status: "open" as const,
  entryPrice: 100,
  quantity: 10,
  entryDate: "2026-07-21",
};

describe("tradeSchema", () => {
  it("accepts a valid open trade", () => {
    expect(tradeSchema.safeParse(validOpenTrade).success).toBe(true);
  });

  it("rejects an empty symbol", () => {
    const result = tradeSchema.safeParse({ ...validOpenTrade, symbol: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive entry price", () => {
    const result = tradeSchema.safeParse({ ...validOpenTrade, entryPrice: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    const result = tradeSchema.safeParse({ ...validOpenTrade, quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown market", () => {
    const result = tradeSchema.safeParse({ ...validOpenTrade, market: "beanie-babies" });
    expect(result.success).toBe(false);
  });

  // Status is derived by the form (TradeForm.onSubmit) from whether an exit
  // price was entered, not manually selected or schema-validated — so the
  // schema itself no longer requires exitPrice/exitDate when status is
  // "closed". See TradingJournal.integration.test.tsx for the form-level
  // guarantee that a trade only becomes "closed" once it has an exit price.
  describe("closed trade requirements", () => {
    it("accepts a closed trade with exit price and date", () => {
      const result = tradeSchema.safeParse({
        ...validOpenTrade,
        status: "closed",
        exitPrice: 110,
        exitDate: "2026-07-22",
      });
      expect(result.success).toBe(true);
    });

    it("does not require exit fields for an open trade", () => {
      expect(tradeSchema.safeParse(validOpenTrade).success).toBe(true);
    });
  });

  describe("psychology and metadata fields", () => {
    it("accepts confidence scores within 1-5", () => {
      const result = tradeSchema.safeParse({
        ...validOpenTrade,
        emotionBefore: "confident",
        confidenceBefore: 4,
      });
      expect(result.success).toBe(true);
    });

    it("rejects a confidence score outside 1-5", () => {
      const result = tradeSchema.safeParse({
        ...validOpenTrade,
        confidenceBefore: 6,
      });
      expect(result.success).toBe(false);
    });

    it("accepts tags and screenshots", () => {
      const result = tradeSchema.safeParse({
        ...validOpenTrade,
        tags: ["breakout", "high-conviction"],
        screenshots: ["data:image/png;base64,abc123"],
      });
      expect(result.success).toBe(true);
    });
  });
});
