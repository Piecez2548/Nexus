import { workoutEntryRepository } from "@/features/workouts/repositories/workoutEntryRepository";
import { createCrudService } from "@/database/createCrudService";
import type { WorkoutEntry } from "../types";

export const workoutEntryService = createCrudService<WorkoutEntry>(workoutEntryRepository);
