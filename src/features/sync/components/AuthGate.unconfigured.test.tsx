import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: false,
  supabase: null,
}));

const { default: AuthGate } = await import("./AuthGate");

describe("AuthGate (sync not configured)", () => {
  it("renders children directly — there's no account system to gate behind", () => {
    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
