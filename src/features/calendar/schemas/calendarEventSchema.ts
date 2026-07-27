import { z } from "zod";

export const calendarEventSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่อรายการ"),
  notes: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().min(1, "กรุณาเลือกวันและเวลา"),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  recurring: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    })
    .nullable()
    .optional(),
  reminderMinutesBefore: z.union([z.literal(0), z.literal(15), z.literal(60), z.literal(1440)]).nullable().optional(),
});

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;
