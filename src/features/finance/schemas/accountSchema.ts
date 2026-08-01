import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const accountTypeEnum = z.enum([
  "cash",
  "bank",
  "credit_card",
  "investment",
  "crypto",
  "loan",
  "digital_wallet",
  "other",
]);

export function accountSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.account.nameRequired")),
    type: accountTypeEnum,
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
  });
}

export type AccountFormData = z.infer<ReturnType<typeof accountSchema>>;
