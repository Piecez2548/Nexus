import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const transactionTypeEnum = z.enum([
  "expense",
  "income",
  "transfer",
  "refund",
  "adjustment",
]);

export const transactionStatusEnum = z.enum(["completed", "pending"]);

export const recurringFrequencyEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export function transactionSchema(t: TranslateFn) {
  return z
    .object({
      title: z.string().min(1, t("validation.common.itemNameRequired")),

      amount: z
        .number({
          error: t("validation.common.amountRequired"),
        })
        .positive(t("validation.common.amountPositive")),

      type: transactionTypeEnum,

      category: z.string().optional(),

      account: z.string().min(1, t("validation.common.accountRequired")),

      toAccount: z.string().optional(),

      date: z.string(),

      time: z.string().optional(),

      tags: z.array(z.string()).optional(),

      attachment: z.string().optional(),

      note: z.string().optional(),

      recipient: z.string().optional(),

      status: transactionStatusEnum.optional(),

      recurring: z
        .object({ frequency: recurringFrequencyEnum })
        .nullable()
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (
        (data.type === "income" || data.type === "expense") &&
        !data.category
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["category"],
          message: t("validation.common.categoryRequired"),
        });
      }

      if (data.type === "transfer" && !data.toAccount) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccount"],
          message: t("validation.common.toAccountRequired"),
        });
      }

      if (
        data.type === "transfer" &&
        data.toAccount &&
        data.toAccount === data.account
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccount"],
          message: t("validation.transaction.toAccountDuplicate"),
        });
      }
    });
}

export type TransactionFormData =
  z.infer<ReturnType<typeof transactionSchema>>;
