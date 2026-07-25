import type {
  MarketType,
  TradeDirection,
  TradingSession,
  TradeEmotion,
  TradeResult,
} from "@/features/trading/types";

export const MARKET_LABELS: Record<MarketType, string> = {
  stocks: "Stocks",
  etf: "ETF",
  forex: "Forex",
  cfd: "CFD",
  crypto: "Crypto",
  futures: "Futures",
  options: "Options",
  indices: "Indices",
  commodities: "Commodities",
  custom: "Custom",
};

export const DIRECTION_LABELS: Record<TradeDirection, string> = {
  long: "Long",
  short: "Short",
};

export const SESSION_LABELS: Record<TradingSession, string> = {
  asian: "Asian",
  london: "London",
  new_york: "New York",
  sydney: "Sydney",
  overlap: "Overlap",
};

export const EMOTION_LABELS: Record<TradeEmotion, string> = {
  confident: "Confident",
  calm: "Calm",
  neutral: "Neutral",
  anxious: "Anxious",
  fearful: "Fearful",
  greedy: "Greedy",
  frustrated: "Frustrated",
  fomo: "FOMO",
};

export const RESULT_LABELS: Record<TradeResult, string> = {
  open: "Open",
  win: "Win",
  loss: "Loss",
  unknown: "-",
};
