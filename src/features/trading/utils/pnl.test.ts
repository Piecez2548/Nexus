import { describe, expect, it } from "vitest";
import { calculatePnl, calculateRR, calculateResult, calculateRealizedRMultiple, calculateHoldingMinutes } from "./pnl";
import type { Trade } from "../types";

const baseTrade: Trade = {
  symbol: "AAPL",
  market: "stocks",
  direction: "long",
  status: "open",
  entryPrice: 100,
  quantity: 10,
  entryDate: "2026-07-21",
};

describe("calculatePnl", () => {
  it("returns null for an open trade", () => {
    expect(calculatePnl(baseTrade)).toBeNull();
  });

  it("computes profit for a winning long trade", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 110 };
    expect(calculatePnl(trade)).toBe(100); // (110-100) * 10
  });

  it("computes loss for a losing long trade", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 90 };
    expect(calculatePnl(trade)).toBe(-100);
  });

  it("computes profit for a winning short trade", () => {
    const trade: Trade = { ...baseTrade, direction: "short", status: "closed", exitPrice: 90 };
    expect(calculatePnl(trade)).toBe(100); // (100-90) * 10
  });

  it("subtracts commission and adds swap", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      commission: 5,
      swap: -2,
    };
    expect(calculatePnl(trade)).toBe(93); // 100 - 5 - 2
  });
});

describe("calculateRR", () => {
  it("returns null without a stop loss", () => {
    expect(calculateRR(baseTrade)).toBeNull();
  });

  it("computes RR for an open trade using the take-profit target", () => {
    const trade: Trade = { ...baseTrade, stopLoss: 95, takeProfit: 115 };
    expect(calculateRR(trade)).toBe(3); // risk 5, reward 15
  });

  it("computes RR for a closed trade using the realized exit", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 105,
      stopLoss: 95,
    };
    expect(calculateRR(trade)).toBe(1); // risk 5, reward 5
  });

  it("returns null when stop loss equals entry price", () => {
    const trade: Trade = { ...baseTrade, stopLoss: 100, takeProfit: 110 };
    expect(calculateRR(trade)).toBeNull();
  });
});

describe("calculateResult", () => {
  it("returns 'open' for an open trade", () => {
    expect(calculateResult(baseTrade)).toBe("open");
  });

  it("returns 'win' for a closed trade with positive P/L", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 110 };
    expect(calculateResult(trade)).toBe("win");
  });

  it("returns 'loss' for a closed trade with negative P/L", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 90 };
    expect(calculateResult(trade)).toBe("loss");
  });

  it("returns 'unknown' for a closed trade missing an exit price", () => {
    const trade: Trade = { ...baseTrade, status: "closed" };
    expect(calculateResult(trade)).toBe("unknown");
  });
});

describe("calculateRealizedRMultiple", () => {
  it("returns null without a stop loss", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 110 };
    expect(calculateRealizedRMultiple(trade)).toBeNull();
  });

  it("expresses realized P/L as a multiple of the amount at risk", () => {
    // Risk: |100-95| * 10 = 50. PnL: (110-100) * 10 = 100. R = 100/50 = 2.
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 110, stopLoss: 95 };
    expect(calculateRealizedRMultiple(trade)).toBe(2);
  });

  it("is negative for a losing trade", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 90, stopLoss: 95 };
    expect(calculateRealizedRMultiple(trade)).toBe(-2); // risk 50, pnl -100
  });

  it("returns null when stop loss equals entry price", () => {
    const trade: Trade = { ...baseTrade, status: "closed", exitPrice: 110, stopLoss: 100 };
    expect(calculateRealizedRMultiple(trade)).toBeNull();
  });
});

describe("calculateHoldingMinutes", () => {
  it("returns null for an open trade (no exit date)", () => {
    expect(calculateHoldingMinutes(baseTrade)).toBeNull();
  });

  it("computes the span using exact entry/exit times when both are present", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      entryTime: "09:30",
      exitDate: "2026-07-21",
      exitTime: "11:00",
    };
    expect(calculateHoldingMinutes(trade)).toBe(90);
  });

  it("spans multiple calendar days correctly", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      entryTime: "12:00",
      exitDate: "2026-07-23",
      exitTime: "12:00",
    };
    expect(calculateHoldingMinutes(trade)).toBe(2 * 24 * 60); // exactly 2 days
  });

  it("defaults a missing entryTime/exitTime to 00:00", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      exitDate: "2026-07-22", // no entryTime/exitTime given
    };
    expect(calculateHoldingMinutes(trade)).toBe(24 * 60); // exactly 1 day at midnight-to-midnight
  });

  it("returns null when the computed span is negative (bad data)", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      entryTime: "15:00",
      exitDate: "2026-07-21", // same day as entry
      exitTime: "09:00", // before entryTime
    };
    expect(calculateHoldingMinutes(trade)).toBeNull();
  });
});
