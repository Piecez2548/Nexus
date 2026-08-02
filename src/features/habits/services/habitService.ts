import { habitRepository } from "@/features/habits/repositories/habitRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Habit } from "../types";

export const habitService = createCrudService<Habit>(habitRepository);
