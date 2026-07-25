import { habitRepository } from "@/features/habits/repositories/habitRepository";
import type { Habit } from "../types";

export const habitService = {
  list: () => habitRepository.getAll(),

  create: (habit: Habit) => habitRepository.add(habit),

  update: (id: number, habit: Habit) =>
    habitRepository.update(id, habit),

  remove: (id: number) => habitRepository.remove(id),
};
