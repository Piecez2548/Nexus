import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function holdingSchema(t: TranslateFn) {
  return z.object({
    symbol: z.string().min(1, t("validation.common.symbolRequired")),
    market: z.enum(
      ["stocks", "etf", "forex", "cfd", "crypto", "futures", "options", "indices", "commodities", "custom"],
      { error: t("validation.holding.marketRequired") }
    ),
    quantity: z.number({ error: t("validation.common.quantityRequired") }).positive(t("validation.common.quantityPositive")),
    avgCostPrice: z.number({ error: t("validation.holding.avgCostPriceRequired") }).min(0, t("validation.holding.avgCostPriceNotNegative")),
    notes: z.string().optional(),
  });
}

export type HoldingFormData = z.infer<ReturnType<typeof holdingSchema>>;
