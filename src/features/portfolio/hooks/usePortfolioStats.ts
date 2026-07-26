import { useMemo } from "react";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { valuateHolding } from "@/features/portfolio/utils/valuation";

export function usePortfolioStats() {
  const { holdings } = useHoldingStore();

  return useMemo(() => {
    let totalCostBasis = 0;
    let totalCurrentValue = 0;
    let totalUnrealizedPnl = 0;
    let pricedCostBasis = 0;
    let pricedHoldingsCount = 0;

    for (const holding of holdings) {
      const v = valuateHolding(holding);
      totalCostBasis += v.costBasis;
      totalCurrentValue += v.currentValue;
      if (v.unrealizedPnl !== null) {
        totalUnrealizedPnl += v.unrealizedPnl;
        pricedCostBasis += v.costBasis;
        pricedHoldingsCount++;
      }
    }

    return {
      holdingsCount: holdings.length,
      pricedHoldingsCount,
      totalCostBasis,
      totalCurrentValue,
      // A partial sum (from whichever holdings ARE priced) is still more
      // informative than hiding it — null only when literally none of them
      // have a price yet. pricedHoldingsCount lets the UI show the caveat
      // whenever the sum is partial rather than complete.
      totalUnrealizedPnl: pricedHoldingsCount > 0 ? totalUnrealizedPnl : null,
      // Percent against pricedCostBasis (the capital the P/L above actually
      // measures), never the full totalCostBasis — dividing a partial P/L
      // by the whole portfolio's cost basis would dilute it into a number
      // that doesn't correspond to any real return on any real capital.
      totalUnrealizedPnlPercent:
        pricedHoldingsCount > 0 && pricedCostBasis > 0 ? (totalUnrealizedPnl / pricedCostBasis) * 100 : null,
    };
  }, [holdings]);
}
