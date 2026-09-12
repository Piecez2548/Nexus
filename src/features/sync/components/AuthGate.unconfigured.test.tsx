import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: false,
  supabase: null,
}));

const { default: AuthGate } = await import("./AuthGate");

describe("AuthGate (sync not configured)", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("blocks production web access even without account configuration", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MODE", "production");
    render(<AuthGate><p>Protected content</p></AuthGate>);
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText(/Sign-in is not configured/)).toBeInTheDocument();
  });
  it("renders children directly — there's no account system to gate behind", () => {
    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
