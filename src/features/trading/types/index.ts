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
