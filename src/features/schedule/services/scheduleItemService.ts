import { scheduleItemRepository } from "@/features/schedule/repositories/scheduleItemRepository";
import type { ScheduleItem } from "../types";

export const scheduleItemService = {
  list: () => scheduleItemRepository.getAll(),

  create: (item: ScheduleItem) => scheduleItemRepository.add(item),

  update: (id: number, item: ScheduleItem) =>
    scheduleItemRepository.update(id, item),

  remove: (id: number) => scheduleItemRepository.remove(id),
};
