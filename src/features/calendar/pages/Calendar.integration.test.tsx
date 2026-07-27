import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Calendar from "./Calendar";
import { db } from "@/database/db";
import { useCalendarEventStore } from "@/features/calendar/store/calendarEventStore";

function nearFutureStartAt(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T09:00`;
}

describe("Calendar page", () => {
  beforeEach(async () => {
    await db.calendarEvents.clear();
    useCalendarEventStore.setState({ events: [], loading: false, error: null });
  });

  it("creates a new event and shows it in the agenda list", async () => {
    const user = userEvent.setup();
    render(<Calendar />);

    await user.click(screen.getByRole("button", { name: /add event/i }));
    await user.type(await screen.findByLabelText("Title"), "Team meeting");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getAllByText("Team meeting")).toHaveLength(1));
  });

  it("edits an event from the agenda list", async () => {
    await db.calendarEvents.add({
      title: "Old title",
      startAt: nearFutureStartAt(2),
      createdAt: "2026-07-01T00:00:00.000Z",
    } as never);

    const user = userEvent.setup();
    render(<Calendar />);

    await user.click(await screen.findByRole("button", { name: "Edit Old title" }));
    const titleInput = await screen.findByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New title");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("New title")).toBeInTheDocument());
    expect(screen.queryByText("Old title")).not.toBeInTheDocument();
  });

  it("shows a daily recurring event once in the agenda list, not once per occurrence", async () => {
    await db.calendarEvents.add({
      title: "Daily workout",
      startAt: nearFutureStartAt(1),
      recurring: { frequency: "daily" },
      createdAt: "2026-07-01T00:00:00.000Z",
    } as never);

    render(<Calendar />);

    await waitFor(() => expect(screen.getAllByText("Daily workout")).toHaveLength(1));
    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("deletes an event", async () => {
    await db.calendarEvents.add({
      title: "One-off event",
      startAt: nearFutureStartAt(2),
      createdAt: "2026-07-01T00:00:00.000Z",
    } as never);

    const user = userEvent.setup();
    render(<Calendar />);

    await user.click(await screen.findByRole("button", { name: "Delete One-off event" }));

    await waitFor(() => {
      expect(screen.getByText("No events yet — press the Add Event button to start")).toBeInTheDocument();
    });
  });
});
