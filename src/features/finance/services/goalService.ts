import { goalRepository } from "@/features/finance/repositories/goalRepository";
import type { Goal } from "../types";

export const goalService = {
  list: () => goalRepository.getAll(),

  create: (goal: Goal) => goalRepository.add(goal),

  update: (id: number, goal: Goal) =>
    goalRepository.update(id, goal),

  remove: (id: number) => goalRepository.remove(id),
};
