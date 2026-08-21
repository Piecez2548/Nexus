import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/supabaseClient", () => ({ isSyncConfigured: true }));

const { useAiCoachSettingsStore } = await import("@/store/aiCoachSettingsStore");
const { default: AiCoachSettings } = await import("./AiCoachSettings");

describe("AiCoachSettings (sync configured)", () => {
  beforeEach(() => {
    useAiCoachSettingsStore.setState({ enabled: false });
  });

  it("shows the toggle, off by default", () => {
    render(<AiCoachSettings />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("enables the setting when clicked", async () => {
    const user = userEvent.setup();
    render(<AiCoachSettings />);

    await user.click(screen.getByRole("switch"));

    expect(useAiCoachSettingsStore.getState().enabled).toBe(true);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});
