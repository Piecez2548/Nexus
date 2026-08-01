import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn();
const mockRunFullSync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

vi.mock("@/features/sync/syncEngine", () => ({
  runFullSync: (...args: unknown[]) => mockRunFullSync(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: SyncSettings } = await import("./SyncSettings");

describe("SyncSettings", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      initialized: true,
      loading: false,
      error: null,
      needsEmailConfirmation: false,
      syncing: false,
      lastSyncedAt: null,
    });
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset().mockResolvedValue({ error: null });
    mockRunFullSync.mockReset().mockResolvedValue(undefined);
  });

  it("shows a sign-in form when signed out", () => {
    render(<SyncSettings />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("switches to the sign-up form and submits it", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "new@user.com" }, session: { access_token: "token" } },
      error: null,
    });

    const user = userEvent.setup();
    render(<SyncSettings />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    await user.type(screen.getByLabelText("Email"), "new@user.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockSignUp).toHaveBeenCalledWith({ email: "new@user.com", password: "password123" });
  });

  it("shows a confirmation message when sign up requires email verification", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "new@user.com" }, session: null },
      error: null,
    });

    const user = userEvent.setup();
    render(<SyncSettings />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    await user.type(screen.getByLabelText("Email"), "new@user.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(await screen.findByText(/confirm your email/i)).toBeInTheDocument();
  });

  it("shows the signed-in state with sync controls", () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never, lastSyncedAt: null });

    render(<SyncSettings />);

    expect(screen.getByText(/me@nexus.app/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("triggers a sync when Sync Now is clicked", async () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });

    const user = userEvent.setup();
    render(<SyncSettings />);

    await user.click(screen.getByRole("button", { name: /sync now/i }));

    expect(mockRunFullSync).toHaveBeenCalledWith("u1");
  });

  it("signs out when the sign-out button is clicked", async () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });

    const user = userEvent.setup();
    render(<SyncSettings />);

    await user.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(mockSignOut).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
