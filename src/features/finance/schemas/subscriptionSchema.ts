import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const subscriptionStatusEnum = z.enum(["active", "paused", "cancelled"]);
export const subscriptionFrequencyEnum = z.enum(["daily", "weekly", "monthly", "yearly"]);

export function subscriptionSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.subscription.nameRequired")),
    amount: z
      .number({ error: t("validation.subscription.amountRequired") })
      .positive(t("validation.subscription.amountPositive")),
    billingFrequency: subscriptionFrequencyEnum,
    nextBillingDate: z.string().min(1, t("validation.subscription.nextBillingDateRequired")),
    status: subscriptionStatusEnum,
    category: z.string().optional(),
    account: z.string().optional(),
    note: z.string().optional(),
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
    reminderEnabled: z.boolean().optional(),
  });
}

export type SubscriptionFormData = z.infer<ReturnType<typeof subscriptionSchema>>;
