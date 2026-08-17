import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Workouts from "./Workouts";
import { db } from "@/database/db";
import { useWorkoutExerciseStore } from "@/features/workouts/store/workoutExerciseStore";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";

describe("Workouts page", () => {
  beforeEach(async () => {
    await db.workoutExercises.clear();
    await db.workoutEntries.clear();
    useWorkoutExerciseStore.setState({ exercises: [], loading: false, error: null });
    useWorkoutEntryStore.setState({ entries: [], loading: false, error: null });
  });

  it("adds an exercise and shows it in the catalog", async () => {
    const user = userEvent.setup();
    render(<Workouts />);

    await user.click(screen.getByRole("button", { name: /add exercise/i }));
    await user.type(await screen.findByLabelText("Exercise name"), "Push-up");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Push-up")).toBeInTheDocument();
  });

  it("logs an entry against an existing exercise and reflects it in today's summary and the activity feed", async () => {
    await db.workoutExercises.add({
      name: "Squat",
      category: "strength",
      icon: "dumbbell",
      color: "#3b82f6",
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Workouts />);

    await user.click(await screen.findByRole("button", { name: /log entry/i }));

    const exerciseSelect = await screen.findByLabelText("Exercise");
    await user.selectOptions(exerciseSelect, "Squat");
    await user.type(screen.getByLabelText("Reps"), "10");
    await user.type(screen.getByLabelText("Rounds"), "3");

    const drawer = exerciseSelect.closest("form")!;
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    // "Squat" now appears twice: once in the Exercises catalog card, once in
    // the new Activity feed entry card.
    await waitFor(() => {
      expect(screen.getAllByText("Squat")).toHaveLength(2);
    });

    // Today's summary reflects the logged entry (1 distinct exercise, 30 total reps).
    await waitFor(() => {
      expect(screen.getByText("30")).toBeInTheDocument(); // totalReps: 10 * 3
    });
  });

  it("deletes a logged entry", async () => {
    await db.workoutExercises.add({
      name: "Plank",
      category: "core",
      icon: "dumbbell",
      color: "#3b82f6",
      createdAt: new Date().toISOString(),
    });
    await db.workoutEntries.add({
      exerciseName: "Plank",
      date: new Date().toISOString().slice(0, 10),
      durationMinutes: 2,
      caloriesBurned: 10,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Workouts />);

    await user.click(await screen.findByRole("button", { name: "Delete entry" }));

    await waitFor(() => {
      expect(screen.getByText("No workouts logged yet")).toBeInTheDocument();
    });
  });
});
