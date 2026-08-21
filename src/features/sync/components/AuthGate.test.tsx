import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRunFullSync = vi.fn();
const mockListFactors = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
      },
    },
  },
}));

vi.mock("@/features/sync/syncEngine", () => ({
  runFullSync: (...args: unknown[]) => mockRunFullSync(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: AuthGate } = await import("./AuthGate");

describe("AuthGate (sync configured)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      initialized: false,
      sessionChecked: false,
      loading: false,
      error: null,
      needsEmailConfirmation: false,
      syncing: false,
      lastSyncedAt: null,
      mfaPending: false,
      mfaFactorId: null,
      mfaError: null,
    });
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockRunFullSync.mockReset().mockResolvedValue(undefined);
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it("shows a loading spinner while the session check is in flight", () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("shows the login screen once checked and there's no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected content once a session is found", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });

  it("shows the MFA challenge screen, not protected content or the login form, when a verified factor is enrolled", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>
    );

    expect(await screen.findByText("Verify it's you")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });
});
