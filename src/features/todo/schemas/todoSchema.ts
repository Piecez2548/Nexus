import { z } from "zod";

export const todoSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่องาน"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  recurring: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export type TodoFormData = z.infer<typeof todoSchema>;
