import { budgetRepository } from "@/features/finance/repositories/budgetRepository";
import type { Budget } from "../types";

export const budgetService = {
  list: () => budgetRepository.getAll(),

  create: (budget: Budget) => budgetRepository.add(budget),

  update: (id: number, budget: Budget) =>
    budgetRepository.update(id, budget),

  remove: (id: number) => budgetRepository.remove(id),
};
