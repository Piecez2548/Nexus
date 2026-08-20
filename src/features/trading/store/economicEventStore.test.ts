import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useEconomicEventStore } from "./economicEventStore";
import { economicEventService } from "../services/economicEventService";

describe("economicEventStore", () => {
  beforeEach(async () => {
    await db.economicEvents.clear();
    useEconomicEventStore.setState({ economicEvents: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("adds, lists, updates, and deletes an event end to end", async () => {
    await useEconomicEventStore.getState().addEconomicEvent({ title: "FOMC Meeting", eventDate: "2026-09-18" });
    expect(useEconomicEventStore.getState().economicEvents).toHaveLength(1);

    const [event] = useEconomicEventStore.getState().economicEvents;
    await useEconomicEventStore
      .getState()
      .updateEconomicEvent(event.id!, { title: "FOMC Meeting", eventDate: "2026-09-18", impact: "high" });
    expect(useEconomicEventStore.getState().economicEvents[0].impact).toBe("high");

    await useEconomicEventStore.getState().deleteEconomicEvent(event.id!);
    expect(useEconomicEventStore.getState().economicEvents).toHaveLength(0);
  });

  it("sets an error and stops loading when loadEconomicEvents fails", async () => {
    vi.spyOn(economicEventService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useEconomicEventStore.getState().loadEconomicEvents();

    expect(useEconomicEventStore.getState().loading).toBe(false);
    expect(useEconomicEventStore.getState().error).toBe("DB unavailable");
  });

  it("addEconomicEvent rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(economicEventService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useEconomicEventStore.getState().addEconomicEvent({ title: "FOMC Meeting", eventDate: "2026-09-18" })
    ).rejects.toThrow("Write failed");

    expect(useEconomicEventStore.getState().error).toBeNull();
  });
});
