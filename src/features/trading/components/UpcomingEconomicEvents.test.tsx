import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import UpcomingEconomicEvents from "./UpcomingEconomicEvents";
import { db } from "@/database/db";
import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import { useLanguageStore } from "@/store/languageStore";
import type { EconomicEvent } from "@/features/trading/types";

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.economicEvents.clear();
  useEconomicEventStore.setState({ economicEvents: [], loading: false, error: null });
});

async function seed(events: EconomicEvent[]) {
  await db.economicEvents.bulkAdd(events);
}

describe("UpcomingEconomicEvents", () => {
  it("shows the empty state when there are no upcoming events", async () => {
    render(<UpcomingEconomicEvents />);
    expect(await screen.findByText("No upcoming events")).toBeInTheDocument();
  });

  it("excludes events that already happened", async () => {
    await seed([{ title: "Past Event", eventDate: "2020-01-01" }]);
    render(<UpcomingEconomicEvents />);
    expect(await screen.findByText("No upcoming events")).toBeInTheDocument();
    expect(screen.queryByText("Past Event")).not.toBeInTheDocument();
  });

  it("lists upcoming events in chronological order", async () => {
    await seed([
      { title: "Later Event", eventDate: "2099-01-05" },
      { title: "Sooner Event", eventDate: "2099-01-01" },
    ]);

    render(<UpcomingEconomicEvents />);
    await screen.findByText("Sooner Event");
    const items = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(items[0]).toContain("Sooner Event");
    expect(items[1]).toContain("Later Event");
  });

  it("shows an impact badge when set", async () => {
    await seed([{ title: "FOMC Meeting", eventDate: "2099-01-01", impact: "high" }]);
    render(<UpcomingEconomicEvents />);
    expect(await screen.findByText("High Impact")).toBeInTheDocument();
  });
});
