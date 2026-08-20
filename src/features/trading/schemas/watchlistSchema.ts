import { z } from "zod";

import { marketTypeEnum } from "@/features/trading/schemas/tradeSchema";
import type { TranslateFn } from "@/i18n/useTranslation";

export function watchlistSchema(t: TranslateFn) {
  return z.object({
    symbol: z.string().min(1, t("validation.watchlist.symbolRequired")),
    market: marketTypeEnum,
    targetPrice: z.number().positive().optional(),
    notes: z.string().optional(),
  });
}

export type WatchlistFormData = z.infer<ReturnType<typeof watchlistSchema>>;
