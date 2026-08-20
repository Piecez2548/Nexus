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

    // Scoped to the timeline's own row, not a bare text-content count across
    // the whole page: by design, a single always-active item's title also
    // shows in CurrentActivityCard's "current" and/or "next" sections (see
    // NextActivityLine's own comment) -- how many extra times, and where,
    // genuinely depends on the real wall-clock time this suite happens to
    // run at, since this test doesn't pin one. The "Edit {title}" button is
    // unique to the timeline row regardless of what CurrentActivityCard
    // shows, so this assertion is correct at any time of day.
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Morning workout" })).toBeInTheDocument());
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

    // Scoped to the timeline row for the same reason as the "creates a new
    // schedule item" test above -- getByText("New title") would throw on
    // finding multiple matches whenever the edited item is also current/next
    // in CurrentActivityCard at the real time this suite happens to run.
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit New title" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Edit Old title" })).not.toBeInTheDocument();
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
