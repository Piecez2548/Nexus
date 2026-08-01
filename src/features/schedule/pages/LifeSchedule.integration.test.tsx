import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LifeSchedule from "./LifeSchedule";
import { db } from "@/database/db";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";

describe("LifeSchedule page", () => {
  beforeEach(async () => {
    await db.scheduleItems.clear();
    useScheduleItemStore.setState({ items: [], loading: false, error: null });
  });

  it("creates a new schedule item and shows it in the timeline", async () => {
    const user = userEvent.setup();
    render(<LifeSchedule />);

    await user.click(screen.getByRole("button", { name: /add item/i }));
    await user.type(await screen.findByLabelText("Title"), "Morning workout");
    await user.type(screen.getByLabelText("Start time"), "07:00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getAllByText("Morning workout")).toHaveLength(1));
  });

  it("edits a schedule item from the timeline", async () => {
    await db.scheduleItems.add({
      title: "Old title",
      icon: "sunrise",
      color: "#3b82f6",
      startTime: "07:00",
      repeat: { frequency: "daily" },
      enabled: true,
      createdAt: "2026-07-01T00:00:00.000Z",
    } as never);

    const user = userEvent.setup();
    render(<LifeSchedule />);

    await user.click(await screen.findByRole("button", { name: "Edit Old title" }));
    const titleInput = await screen.findByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New title");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("New title")).toBeInTheDocument());
    expect(screen.queryByText("Old title")).not.toBeInTheDocument();
  });

  it("deletes a schedule item", async () => {
    await db.scheduleItems.add({
      title: "Evening walk",
      icon: "sunrise",
      color: "#3b82f6",
      startTime: "18:00",
      repeat: { frequency: "daily" },
      enabled: true,
      createdAt: "2026-07-01T00:00:00.000Z",
    } as never);

    const user = userEvent.setup();
    render(<LifeSchedule />);

    await user.click(await screen.findByRole("button", { name: "Delete Evening walk" }));

    await waitFor(() => {
      expect(screen.getByText("No schedule items yet — press the Add Item button to start")).toBeInTheDocument();
    });
  });
});
