import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { ScheduleItem } from "../types";

export const scheduleItemRepository = createRepository<ScheduleItem>(db.scheduleItems, "scheduleItems");
