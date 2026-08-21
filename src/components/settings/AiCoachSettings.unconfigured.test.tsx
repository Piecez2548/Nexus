import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({ isSyncConfigured: false }));

const { default: AiCoachSettings } = await import("./AiCoachSettings");

describe("AiCoachSettings (sync not configured)", () => {
  it("shows the not-configured state instead of the toggle", () => {
    render(<AiCoachSettings />);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("Your data stays on this device only (local-only)")).toBeInTheDocument();
  });
});
