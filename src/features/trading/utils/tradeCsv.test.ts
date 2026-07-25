import { describe, expect, it } from "vitest";
import { tradesToCsv } from "./tradeCsv";
import type { Trade } from "../types";

describe("tradesToCsv", () => {
  it("writes a header row plus one row per trade", () => {
    const trades: Trade[] = [
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 120,
        quantity: 10,
        strategy: "Breakout",
        emotionBefore: "confident",
        entryDate: "2026-07-20",
        exitDate: "2026-07-20",
      },
    ];

    const csv = tradesToCsv(trades);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("date,symbol,market,direction,lot,entry,exit,pnl,risk,rr,strategy,emotion,result");
    // Leading apostrophe forces Excel to treat the date as literal text
    // instead of auto-converting it to a date serial number.
    expect(lines[1]).toBe("'2026-07-20,AAPL,Stocks,Long,10,100,120,200.00,,,Breakout,Confident,Win");
  });

  it("leaves optional fields blank for an open trade with no strategy/emotion", () => {
    const trades: Trade[] = [
      {
        symbol: "MSFT",
        market: "stocks",
        direction: "long",
        status: "open",
        entryPrice: 300,
        quantity: 5,
        entryDate: "2026-07-21",
      },
    ];

    const csv = tradesToCsv(trades);
    const [, row] = csv.split("\n");

    expect(row).toBe("'2026-07-21,MSFT,Stocks,Long,5,300,,,,,,,Open");
  });

  it("quotes a strategy value containing a comma", () => {
    const trades: Trade[] = [
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 90,
        quantity: 10,
        strategy: "Range, Reversal",
        entryDate: "2026-07-20",
        exitDate: "2026-07-20",
      },
    ];

    const csv = tradesToCsv(trades);
    const [, row] = csv.split("\n");

    expect(row).toContain('"Range, Reversal"');
    expect(row.endsWith(",Loss")).toBe(true);
  });
});
