import { z } from "zod";

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

export const transactionSchema = z
  .object({
    title: z.string().min(1, "กรุณากรอกชื่อรายการ"),

    amount: z
      .number({
        error: "กรุณากรอกจำนวนเงิน",
      })
      .positive("จำนวนเงินต้องมากกว่า 0"),

    type: transactionTypeEnum,

    category: z.string().optional(),

    account: z.string().min(1, "กรุณาเลือกบัญชี"),

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
        message: "กรุณาเลือกหมวดหมู่",
      });
    }

    if (data.type === "transfer" && !data.toAccount) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccount"],
        message: "กรุณาเลือกบัญชีปลายทาง",
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
        message: "บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน",
      });
    }
  });

export type TransactionFormData =
  z.infer<typeof transactionSchema>;
