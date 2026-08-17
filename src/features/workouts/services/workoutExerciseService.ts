import { workoutExerciseRepository } from "@/features/workouts/repositories/workoutExerciseRepository";
import { createCrudService } from "@/database/createCrudService";
import type { WorkoutExercise } from "../types";

export const workoutExerciseService = createCrudService<WorkoutExercise>(workoutExerciseRepository);
