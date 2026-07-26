import type { SyncMeta } from "@/utils/syncMeta";
import type { MarketType } from "@/features/trading/types";

export interface Holding extends SyncMeta {
  id?: number;
  symbol: string;
  market: MarketType;
  quantity: number;
  avgCostPrice: number;
  // Manually entered/updated by the user — there is no live price feed
  // anywhere in this app. Optional until the user sets it for the first
  // time via HoldingCard's inline control.
  currentPrice?: number;
  currentPriceUpdatedAt?: string;
  notes?: string;
  createdAt: string;
}
