import type { WorkoutExercise } from "@/features/workouts/types";

// Explicit URL wins when set on a catalog exercise; otherwise falls back to
// an auto-built YouTube search for the exercise name -- genuinely automatic
// linking with no API key/quota needed (this app has no YouTube Data API
// integration).
export function buildYoutubeUrl(exercise: Pick<WorkoutExercise, "name" | "youtubeUrl">): string {
  if (exercise.youtubeUrl?.trim()) return exercise.youtubeUrl;

  const query = encodeURIComponent(`${exercise.name} exercise form`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
