import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EconomicEventForm from "./EconomicEventForm";
import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import { useLanguageStore } from "@/store/languageStore";
import { db } from "@/database/db";

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.economicEvents.clear();
  useEconomicEventStore.setState({ economicEvents: [], loading: false, error: null });
});

describe("EconomicEventForm", () => {
  // Regression: the Impact <select> renders a "-" placeholder option
  // (value="") for its optional field, but wasn't coerced to undefined on
  // submit -- Zod's economicEventImpactEnum.optional() only accepts
  // undefined, not "", so leaving Impact unselected silently failed
  // validation with no error shown, and the form never closed (found via a
  // manual browser walkthrough, not caught by any prior automated test).
  it("submits successfully when the optional Impact field is left unselected", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EconomicEventForm event={null} onDone={onDone} />);

    await user.type(screen.getByLabelText("Event title"), "FOMC Meeting");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useEconomicEventStore.getState().economicEvents).toHaveLength(1);
    expect(useEconomicEventStore.getState().economicEvents[0]).toMatchObject({ title: "FOMC Meeting", impact: undefined });
  });

  it("submits successfully when an Impact is selected", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EconomicEventForm event={null} onDone={onDone} />);

    await user.type(screen.getByLabelText("Event title"), "Rate Decision");
    await user.selectOptions(screen.getByLabelText("Impact"), "high");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useEconomicEventStore.getState().economicEvents[0]).toMatchObject({ title: "Rate Decision", impact: "high" });
  });
});
