import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const economicEventImpactEnum = z.enum(["low", "medium", "high"]);

export function economicEventSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(1, t("validation.economicEvent.titleRequired")),
    eventDate: z.string().min(1, t("validation.economicEvent.eventDateRequired")),
    eventTime: z.string().optional(),
    impact: economicEventImpactEnum.optional(),
    notes: z.string().optional(),
  });
}

export type EconomicEventFormData = z.infer<ReturnType<typeof economicEventSchema>>;
