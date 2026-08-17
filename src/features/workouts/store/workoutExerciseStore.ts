import { create } from "zustand";
import { workoutExerciseService } from "@/features/workouts/services/workoutExerciseService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { WorkoutExercise } from "@/features/workouts/types";

interface WorkoutExerciseState {
  exercises: WorkoutExercise[];
  loading: boolean;
  error: string | null;

  loadExercises: () => Promise<void>;
  addExercise: (exercise: WorkoutExercise) => Promise<void>;
  updateExercise: (id: number, exercise: WorkoutExercise) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
}

export const useWorkoutExerciseStore =
  create<WorkoutExerciseState>((set) => ({
    exercises: [],
    ...initialAsyncState,

    loadExercises: async () => {
      set({ loading: true, error: null });

      try {
        const exercises = await workoutExerciseService.list();
        set({ exercises, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addExercise(exercise) {
      await workoutExerciseService.create(exercise);
      const exercises = await workoutExerciseService.list();
      set({ exercises });
    },

    async updateExercise(id, exercise) {
      await workoutExerciseService.update(id, exercise);
      const exercises = await workoutExerciseService.list();
      set({ exercises });
    },

    async deleteExercise(id) {
      await workoutExerciseService.remove(id);
      const exercises = await workoutExerciseService.list();
      set({ exercises });
    },
  }));
