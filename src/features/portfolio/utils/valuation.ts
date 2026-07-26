import type { Holding } from "@/features/portfolio/types";

type Priceable = Pick<Holding, "quantity" | "avgCostPrice" | "currentPrice">;

export interface HoldingValuation {
  costBasis: number;
  currentValue: number;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
}

export function costBasis(h: Pick<Holding, "quantity" | "avgCostPrice">): number {
  return h.quantity * h.avgCostPrice;
}

// No current price yet -> current value equals cost basis (not $0), so an
// unpriced holding never implies a wipeout in a portfolio total.
export function currentValue(h: Priceable): number {
  return h.quantity * (h.currentPrice ?? h.avgCostPrice);
}

// Null means "genuinely unknown," never a silent 0 — mirrors calculatePnl's
// contract in trading/utils/pnl.ts for an open trade with no exit price.
export function unrealizedPnl(h: Priceable): number | null {
  if (h.currentPrice === undefined) return null;
  return (h.currentPrice - h.avgCostPrice) * h.quantity;
}

// Also null when avgCostPrice is 0 (a gifted/zero-cost position) — division
// by zero has no meaningful percent.
export function unrealizedPnlPercent(h: Pick<Holding, "avgCostPrice" | "currentPrice">): number | null {
  if (h.currentPrice === undefined || h.avgCostPrice === 0) return null;
  return ((h.currentPrice - h.avgCostPrice) / h.avgCostPrice) * 100;
}

export function valuateHolding(h: Priceable): HoldingValuation {
  return {
    costBasis: costBasis(h),
    currentValue: currentValue(h),
    unrealizedPnl: unrealizedPnl(h),
    unrealizedPnlPercent: unrealizedPnlPercent(h),
  };
}
