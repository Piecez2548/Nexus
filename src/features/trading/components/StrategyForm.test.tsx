import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StrategyForm from "./StrategyForm";
import { useStrategyStore } from "@/features/trading/store/strategyStore";
import { useLanguageStore } from "@/store/languageStore";
import { db } from "@/database/db";

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.strategies.clear();
  useStrategyStore.setState({ strategies: [], loading: false, error: null });
});

describe("StrategyForm", () => {
  // Regression: the Market <select> renders a "-" placeholder option
  // (value="") for its optional field, but wasn't coerced to undefined on
  // submit -- Zod's marketTypeEnum.optional() only accepts undefined, not
  // "", so leaving Market unselected silently failed validation with no
  // error shown anywhere, and the form just never closed (found via a
  // manual browser walkthrough, not caught by any prior automated test).
  it("submits successfully when the optional Market field is left unselected", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<StrategyForm strategy={null} onDone={onDone} />);

    await user.type(screen.getByLabelText("Strategy name"), "Breakout Pro");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useStrategyStore.getState().strategies).toHaveLength(1);
    expect(useStrategyStore.getState().strategies[0]).toMatchObject({ name: "Breakout Pro", market: undefined });
  });

  it("submits successfully when a Market is selected", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<StrategyForm strategy={null} onDone={onDone} />);

    await user.type(screen.getByLabelText("Strategy name"), "Reversal");
    await user.selectOptions(screen.getByLabelText("Market"), "forex");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useStrategyStore.getState().strategies[0]).toMatchObject({ name: "Reversal", market: "forex" });
  });
});
