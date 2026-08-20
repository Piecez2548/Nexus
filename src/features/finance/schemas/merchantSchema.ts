import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function merchantSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.merchant.nameRequired")),
    category: z.string().min(1, t("validation.merchant.categoryRequired")),
    icon: z.string().optional(),
  });
}

export type MerchantFormData = z.infer<ReturnType<typeof merchantSchema>>;
