import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function goalSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.goal.nameRequired")),
    targetAmount: z
      .number({ error: t("validation.goal.targetAmountRequired") })
      .positive(t("validation.common.amountPositive")),
    currentAmount: z
      .number({ error: t("validation.goal.currentAmountRequired") })
      .min(0, t("validation.goal.amountNotNegative")),
    deadline: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  });
}

export type GoalFormData = z.infer<ReturnType<typeof goalSchema>>;
