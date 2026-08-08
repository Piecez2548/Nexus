import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguageStore } from "@/store/languageStore";

import type { Command } from "./commands";
import CommandPalette from "./CommandPalette";

function renderPalette(commands: Command[]) {
  return render(
    <MemoryRouter>
      <CommandPalette commands={commands} />
    </MemoryRouter>,
  );
}

beforeEach(() => useLanguageStore.setState({ language: "en" }));

describe("CommandPalette", () => {
  it("is closed until Ctrl+K, then opens", () => {
    renderPalette([{ id: "a", title: "Transactions", run: vi.fn() }]);
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("filters and runs a command", async () => {
    const run = vi.fn();
    const user = userEvent.setup();
    renderPalette([
      { id: "a", title: "Transactions", run },
      { id: "b", title: "Budget", run: vi.fn() },
    ]);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await user.type(screen.getByPlaceholderText("Type a command or search…"), "trans");
    expect(screen.queryByText("Budget")).not.toBeInTheDocument();

    await user.click(screen.getByText("Transactions"));
    expect(run).toHaveBeenCalledTimes(1);
    // Palette closes after running.
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();
  });
});
