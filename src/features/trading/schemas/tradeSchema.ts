import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const marketTypeEnum = z.enum([
  "stocks",
  "etf",
  "forex",
  "cfd",
  "crypto",
  "futures",
  "options",
  "indices",
  "commodities",
  "custom",
]);

export const tradeDirectionEnum = z.enum(["long", "short"]);
export const tradeStatusEnum = z.enum(["open", "closed"]);

export const tradingSessionEnum = z.enum([
  "asian",
  "london",
  "new_york",
  "sydney",
  "overlap",
]);

export const tradeEmotionEnum = z.enum([
  "confident",
  "calm",
  "neutral",
  "anxious",
  "fearful",
  "greedy",
  "frustrated",
  "fomo",
]);

const confidenceScore = z
  .number()
  .min(1, "1-5")
  .max(5, "1-5")
  .optional();

export function tradeSchema(t: TranslateFn) {
  return z.object({
    symbol: z.string().min(1, t("validation.common.symbolRequired")),
    market: marketTypeEnum,
    direction: tradeDirectionEnum,
    status: tradeStatusEnum,

    entryPrice: z
      .number({ error: t("validation.trade.entryPriceRequired") })
      .positive(t("validation.trade.entryPricePositive")),
    exitPrice: z.number().positive().optional(),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),
    quantity: z
      .number({ error: t("validation.common.quantityRequired") })
      .positive(t("validation.common.quantityPositive")),

    riskPercent: z.number().optional(),
    positionSize: z.number().optional(),
    commission: z.number().optional(),
    swap: z.number().optional(),
    slippage: z.number().optional(),

    strategy: z.string().optional(),
    setup: z.string().optional(),
    session: tradingSessionEnum.optional(),

    entryDate: z.string().min(1, t("validation.trade.entryDateRequired")),
    entryTime: z.string().optional(),
    exitDate: z.string().optional(),
    exitTime: z.string().optional(),

    emotionBefore: tradeEmotionEnum.optional(),
    confidenceBefore: confidenceScore,
    emotionAfter: tradeEmotionEnum.optional(),
    confidenceAfter: confidenceScore,
    mistakes: z.string().optional(),
    lessonsLearned: z.string().optional(),

    notes: z.string().optional(),
    screenshots: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  });
}

export type TradeFormData = z.infer<ReturnType<typeof tradeSchema>>;
