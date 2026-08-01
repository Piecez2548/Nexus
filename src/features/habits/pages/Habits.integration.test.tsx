import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Habits from "./Habits";
import { db } from "@/database/db";
import { useHabitStore } from "@/features/habits/store/habitStore";

describe("Habits page", () => {
  beforeEach(async () => {
    await db.habits.clear();
    useHabitStore.setState({ habits: [], loading: false, error: null });
  });

  it("creates a new daily habit and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<Habits />);

    await user.click(screen.getByRole("button", { name: /add habit/i }));
    await user.type(await screen.findByLabelText("Habit name"), "Exercise");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Exercise")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Daily")).toHaveLength(1));
  });

  it("checks in a habit and shows a 1-day streak", async () => {
    await db.habits.add({ name: "Read", frequency: "daily", completedDates: [], createdAt: new Date().toISOString() });

    const user = userEvent.setup();
    render(<Habits />);

    const checkInButton = await screen.findByRole("button", { name: /mark read done for today/i });
    await user.click(checkInButton);

    await waitFor(() => {
      expect(screen.getByText("1 day streak")).toBeInTheDocument();
    });
  });

  it("deletes a habit", async () => {
    await db.habits.add({ name: "Meditate", frequency: "daily", completedDates: [], createdAt: new Date().toISOString() });

    const user = userEvent.setup();
    render(<Habits />);

    await user.click(await screen.findByRole("button", { name: "Delete Meditate" }));

    await waitFor(() => {
      expect(screen.getByText("No habits yet")).toBeInTheDocument();
    });
  });

  it("enables a per-habit reminder and round-trips it", async () => {
    const user = userEvent.setup();
    render(<Habits />);

    await user.click(screen.getByRole("button", { name: /add habit/i }));
    await user.type(await screen.findByLabelText("Habit name"), "Exercise");
    await user.click(screen.getByRole("checkbox", { name: "Reminder" }));
    await user.type(screen.getByLabelText("Reminder time"), "06:30");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Exercise")).toBeInTheDocument();

    const habits = await db.habits.toArray();
    const habit = habits.find((h) => h.name === "Exercise");
    expect(habit?.reminderEnabled).toBe(true);
    expect(habit?.reminderTime).toBe("06:30");
    expect(habit?.reminderRepeat).toEqual({ frequency: "daily" });
  });
});
