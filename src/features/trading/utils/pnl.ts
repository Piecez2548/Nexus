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
