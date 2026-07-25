import { z } from "zod";

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

export const accountSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อบัญชี"),
  type: accountTypeEnum,
  icon: z.string().min(1, "กรุณาเลือกไอคอน"),
  color: z.string().min(1, "กรุณาเลือกสี"),
});

export type AccountFormData = z.infer<typeof accountSchema>;
