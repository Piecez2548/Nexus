import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { WorkoutExercise } from "../types";

export const workoutExerciseRepository = createRepository<WorkoutExercise>(db.workoutExercises, "workoutExercises");
