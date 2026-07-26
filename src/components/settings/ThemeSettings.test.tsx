import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ThemeSettings from "./ThemeSettings";
import { useAppSettingsStore } from "@/store/appSettingsStore";

describe("ThemeSettings", () => {
  beforeEach(() => {
    useAppSettingsStore.setState({ themeMode: "dark" });
  });

  it("renders all four theme options", () => {
    render(<ThemeSettings />);

    expect(screen.getByRole("button", { name: /Light/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /System/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mono/i })).toBeInTheDocument();
  });

  it("marks the active theme as pressed", () => {
    useAppSettingsStore.setState({ themeMode: "mono" });
    render(<ThemeSettings />);

    expect(screen.getByRole("button", { name: /Mono/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Light/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to Mono when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeSettings />);

    await user.click(screen.getByRole("button", { name: /Mono/i }));

    expect(useAppSettingsStore.getState().themeMode).toBe("mono");
  });

  it("switches away from Mono when another option is clicked", async () => {
    useAppSettingsStore.setState({ themeMode: "mono" });
    const user = userEvent.setup();
    render(<ThemeSettings />);

    await user.click(screen.getByRole("button", { name: /^Light/i }));

    expect(useAppSettingsStore.getState().themeMode).toBe("light");
  });
});
