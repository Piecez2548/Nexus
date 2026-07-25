import { z } from "zod";

export const categoryTypeEnum = z.enum(["income", "expense"]);

export const categorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
  type: categoryTypeEnum,
  icon: z.string().min(1, "กรุณาเลือกไอคอน"),
  color: z.string().min(1, "กรุณาเลือกสี"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
