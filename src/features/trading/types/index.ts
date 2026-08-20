import type { SyncMeta } from "@/utils/syncMeta";

export type MarketType =
  | "stocks"
  | "etf"
  | "forex"
  | "cfd"
  | "crypto"
  | "futures"
  | "options"
  | "indices"
  | "commodities"
  | "custom";

export type TradeDirection = "long" | "short";

export type TradeStatus = "open" | "closed";

export type TradeResult = "open" | "win" | "loss" | "unknown";

export type TradingSession =
  | "asian"
  | "london"
  | "new_york"
  | "sydney"
  | "overlap";

export type TradeEmotion =
  | "confident"
  | "calm"
  | "neutral"
  | "anxious"
  | "fearful"
  | "greedy"
  | "frustrated"
  | "fomo";

export interface Trade extends SyncMeta {
  id?: number;
  symbol: string;
  market: MarketType;
  direction: TradeDirection;
  status: TradeStatus;

  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;

  riskPercent?: number;
  positionSize?: number;
  commission?: number;
  swap?: number;
  slippage?: number;

  strategy?: string;
  setup?: string;
  session?: TradingSession;

  entryDate: string;
  entryTime?: string;
  exitDate?: string;
  exitTime?: string;

  emotionBefore?: TradeEmotion;
  confidenceBefore?: number;
  emotionAfter?: TradeEmotion;
  confidenceAfter?: number;
  mistakes?: string;
  lessonsLearned?: string;

  notes?: string;
  screenshots?: string[];
  tags?: string[];
}

// A user-authored playbook entry describing one trading strategy: when it
// applies, the rules for entering/exiting it, and lessons learned. Distinct
// from Trade.strategy (a free-text label on individual trades) -- this is
// reference/documentation the user maintains once, not a per-trade field.
export interface Strategy extends SyncMeta {
  id?: number;
  name: string;
  description?: string;
  market?: MarketType;
  entryRules?: string;
  exitRules?: string;
  riskManagementNotes?: string;
  tags?: string[];
}

// A symbol the user is tracking. No live price of any kind (this app has no
// price feed, paid or otherwise -- see Holdings' own manual-price precedent)
// -- targetPrice is a plain number the user compares against themselves.
export interface WatchlistItem extends SyncMeta {
  id?: number;
  symbol: string;
  market: MarketType;
  targetPrice?: number;
  notes?: string;
}

export type EconomicEventImpact = "low" | "medium" | "high";

// A trading-relevant event the user logs themselves -- no external
// economic-calendar API (this app has no paid-API dependency anywhere).
export interface EconomicEvent extends SyncMeta {
  id?: number;
  title: string;
  eventDate: string; // "YYYY-MM-DD", local
  eventTime?: string; // "HH:mm", optional
  impact?: EconomicEventImpact;
  notes?: string;
}
