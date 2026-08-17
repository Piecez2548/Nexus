import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function vaultEntrySchema(t: TranslateFn) {
  return z.object({
    type: z.enum(["password", "note", "recoveryKey"], { error: t("validation.vault.typeRequired") }),
    title: z.string().min(1, t("validation.vault.titleRequired")),
    username: z.string().optional(),
    password: z.string().optional(),
    url: z.string().optional(),
    content: z.string().optional(),
    serviceName: z.string().optional(),
    code: z.string().optional(),
    note: z.string().optional(),
  });
}

export type VaultEntryFormData = z.infer<ReturnType<typeof vaultEntrySchema>>;
