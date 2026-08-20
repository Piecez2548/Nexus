import { z } from "zod";

import { marketTypeEnum } from "@/features/trading/schemas/tradeSchema";
import type { TranslateFn } from "@/i18n/useTranslation";

export function strategySchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.strategy.nameRequired")),
    description: z.string().optional(),
    market: marketTypeEnum.optional(),
    entryRules: z.string().optional(),
    exitRules: z.string().optional(),
    riskManagementNotes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });
}

export type StrategyFormData = z.infer<ReturnType<typeof strategySchema>>;
