import { goalMilestoneEventRepository } from "@/features/finance/repositories/goalMilestoneEventRepository";
import type { GoalMilestoneEvent } from "../types";

export const goalMilestoneEventService = {
  list: () => goalMilestoneEventRepository.getAll(),

  create: (event: GoalMilestoneEvent) => goalMilestoneEventRepository.add(event),

  remove: (id: number) => goalMilestoneEventRepository.remove(id),
};
