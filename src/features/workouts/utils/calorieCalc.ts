import type { WorkoutExercise } from "@/features/workouts/types";

export interface CalorieInput {
  reps?: number;
  rounds?: number;
  durationMinutes?: number;
  distanceMeters?: number;
}

// Combines whichever calorie bases the exercise defines and the input
// actually supplies. Rounded to a whole number -- fractional calories imply
// a precision this app's rate inputs (a user-set estimate) don't have.
export function computeCaloriesBurned(
  exercise: Pick<WorkoutExercise, "caloriesPerMinute" | "caloriesPerRep" | "caloriesPerKm">,
  input: CalorieInput,
): number {
  const totalReps = (input.reps ?? 0) * (input.rounds ?? 1);
  const fromReps = exercise.caloriesPerRep ? totalReps * exercise.caloriesPerRep : 0;
  const fromDuration = exercise.caloriesPerMinute && input.durationMinutes ? exercise.caloriesPerMinute * input.durationMinutes : 0;
  const fromDistance = exercise.caloriesPerKm && input.distanceMeters ? exercise.caloriesPerKm * (input.distanceMeters / 1000) : 0;

  return Math.round(fromReps + fromDuration + fromDistance);
}
