import type { NetWorthItem } from "@/features/finance/types";

export interface NetWorthTotals {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export function calculateNetWorthTotals(items: NetWorthItem[]): NetWorthTotals {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const item of items) {
    if (item.kind === "asset") totalAssets += item.value;
    else totalLiabilities += item.value;
  }

  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}
