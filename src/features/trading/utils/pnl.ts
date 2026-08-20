import { parseLocalDate } from "@/utils/localDate";

import type { Trade, TradeResult } from "../types";

// Realized profit/loss for a closed trade, net of commission and swap.
// Returns null for open trades (no exit price to compute against).
export function calculatePnl(trade: Trade): number | null {
  if (trade.status !== "closed" || trade.exitPrice === undefined) {
    return null;
  }

  const priceDiff =
    trade.direction === "long"
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice;

  const gross = priceDiff * trade.quantity;

  return gross - (trade.commission ?? 0) + (trade.swap ?? 0);
}

// Reward:risk ratio using the stop-loss as the risk baseline, and either
// the realized exit (closed trades) or take-profit target (open trades)
// as the reward. Returns null when there isn't enough data to compute it.
export function calculateRR(trade: Trade): number | null {
  if (trade.stopLoss === undefined) return null;

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  if (risk === 0) return null;

  const rewardTarget =
    trade.status === "closed" && trade.exitPrice !== undefined
      ? trade.exitPrice
      : trade.takeProfit;

  if (rewardTarget === undefined) return null;

  const reward = Math.abs(rewardTarget - trade.entryPrice);

  return reward / risk;
}

// Win/loss outcome for closed trades, "open" while still running, and
// "unknown" for a closed trade missing the data needed to compute P/L.
export function calculateResult(trade: Trade): TradeResult {
  if (trade.status === "open") return "open";

  const pnl = calculatePnl(trade);
  if (pnl === null) return "unknown";

  return pnl >= 0 ? "win" : "loss";
}

// Realized R-multiple: PnL expressed as a multiple of the dollar amount
// that was actually at risk (based on the stop-loss distance). Distinct
// from calculateRR, which is the *planned* reward:risk ratio of the setup
// rather than the realized outcome.
export function calculateRealizedRMultiple(trade: Trade): number | null {
  if (trade.stopLoss === undefined) return null;

  const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss);
  if (riskPerUnit === 0) return null;

  const pnl = calculatePnl(trade);
  if (pnl === null) return null;

  const riskAmount = riskPerUnit * trade.quantity;
  if (riskAmount === 0) return null;

  return pnl / riskAmount;
}

// Minutes between entry and exit. A missing entryTime/exitTime defaults to
// "00:00" -- the trade is still known to have happened somewhere within
// that calendar day, so this is a documented lower-bound estimate, not a
// guess at the actual clock time. Returns null for open trades (no
// exitDate) or a negative span (bad data, e.g. an exit time entered before
// the entry time on the same day).
export function calculateHoldingMinutes(trade: Trade): number | null {
  if (!trade.exitDate) return null;

  const [entryHour, entryMinute] = (trade.entryTime ?? "00:00").split(":").map(Number);
  const entry = parseLocalDate(trade.entryDate);
  entry.setHours(entryHour, entryMinute, 0, 0);

  const [exitHour, exitMinute] = (trade.exitTime ?? "00:00").split(":").map(Number);
  const exit = parseLocalDate(trade.exitDate);
  exit.setHours(exitHour, exitMinute, 0, 0);

  const diffMs = exit.getTime() - entry.getTime();
  if (diffMs < 0) return null;

  return diffMs / 60000;
}
