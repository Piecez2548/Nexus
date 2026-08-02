import { scheduleItemRepository } from "@/features/schedule/repositories/scheduleItemRepository";
import { createCrudService } from "@/database/createCrudService";
import type { ScheduleItem } from "../types";

export const scheduleItemService = createCrudService<ScheduleItem>(scheduleItemRepository);
