import type {
  MarketType,
  TradeDirection,
  TradingSession,
  TradeEmotion,
  TradeResult,
  TradeStatus,
  EconomicEventImpact,
} from "@/features/trading/types";

type Translate = (key: string) => string;

// Mirrors habits/constants/labels.ts's getFrequencyLabels(t) pattern --
// each call returns a freshly-translated Record for the current language,
// rather than exporting static English text (which is how these enum
// labels went untranslated in Thai for as long as they did).
export function getMarketLabels(t: Translate): Record<MarketType, string> {
  return {
    stocks: t("trading.marketStocks"),
    etf: t("trading.marketEtf"),
    forex: t("trading.marketForex"),
    cfd: t("trading.marketCfd"),
    crypto: t("trading.marketCrypto"),
    futures: t("trading.marketFutures"),
    options: t("trading.marketOptions"),
    indices: t("trading.marketIndices"),
    commodities: t("trading.marketCommodities"),
    custom: t("trading.marketCustom"),
  };
}

export function getDirectionLabels(t: Translate): Record<TradeDirection, string> {
  return {
    long: t("trading.directionLong"),
    short: t("trading.directionShort"),
  };
}

export function getSessionLabels(t: Translate): Record<TradingSession, string> {
  return {
    asian: t("trading.sessionAsian"),
    london: t("trading.sessionLondon"),
    new_york: t("trading.sessionNewYork"),
    sydney: t("trading.sessionSydney"),
    overlap: t("trading.sessionOverlap"),
  };
}

export function getEmotionLabels(t: Translate): Record<TradeEmotion, string> {
  return {
    confident: t("trading.emotionConfident"),
    calm: t("trading.emotionCalm"),
    neutral: t("trading.emotionNeutral"),
    anxious: t("trading.emotionAnxious"),
    fearful: t("trading.emotionFearful"),
    greedy: t("trading.emotionGreedy"),
    frustrated: t("trading.emotionFrustrated"),
    fomo: t("trading.emotionFomo"),
  };
}

export function getResultLabels(t: Translate): Record<TradeResult, string> {
  return {
    open: t("trading.resultOpen"),
    win: t("trading.resultWin"),
    loss: t("trading.resultLoss"),
    unknown: t("trading.resultUnknown"),
  };
}

export function getStatusLabels(t: Translate): Record<TradeStatus, string> {
  return {
    open: t("trading.statusOpen"),
    closed: t("trading.statusClosed"),
  };
}

export function getImpactLabels(t: Translate): Record<EconomicEventImpact, string> {
  return {
    low: t("trading.impactLow"),
    medium: t("trading.impactMedium"),
    high: t("trading.impactHigh"),
  };
}
