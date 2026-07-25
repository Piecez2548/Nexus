import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ThemeToggleSwitch from "./ThemeToggleSwitch";
import { useAppSettingsStore } from "@/store/appSettingsStore";

function setMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("ThemeToggleSwitch", () => {
  beforeEach(() => {
    setMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows unchecked when themeMode is light", () => {
    useAppSettingsStore.setState({ themeMode: "light" });
    render(<ThemeToggleSwitch />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("shows checked when themeMode is dark", () => {
    useAppSettingsStore.setState({ themeMode: "dark" });
    render(<ThemeToggleSwitch />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("switches from light to dark when clicked", async () => {
    useAppSettingsStore.setState({ themeMode: "light" });
    const user = userEvent.setup();
    render(<ThemeToggleSwitch />);

    await user.click(screen.getByRole("switch"));

    expect(useAppSettingsStore.getState().themeMode).toBe("dark");
  });

  it("switches from dark to light when clicked", async () => {
    useAppSettingsStore.setState({ themeMode: "dark" });
    const user = userEvent.setup();
    render(<ThemeToggleSwitch />);

    await user.click(screen.getByRole("switch"));

    expect(useAppSettingsStore.getState().themeMode).toBe("light");
  });
});
