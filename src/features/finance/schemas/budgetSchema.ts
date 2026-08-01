import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const budgetPeriodEnum = z.enum(["monthly", "weekly", "yearly"]);

export function budgetSchema(t: TranslateFn) {
  return z.object({
    category: z.string().min(1, t("validation.common.categoryRequired")),
    amount: z
      .number({ error: t("validation.common.amountRequired") })
      .positive(t("validation.common.amountPositive")),
    period: budgetPeriodEnum,
  });
}

export type BudgetFormData = z.infer<ReturnType<typeof budgetSchema>>;
