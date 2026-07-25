import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRunFullSync = vi.fn();

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

const { useAuthStore } = await import("./authStore");

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      initialized: false,
      loading: false,
      error: null,
      needsEmailConfirmation: false,
      syncing: false,
      lastSyncedAt: null,
    });
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
    mockGetSession.mockReset().mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReset();
    mockRunFullSync.mockReset().mockResolvedValue(undefined);
  });

  it("sets the user on successful sign up", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" }, session: { access_token: "token" } },
      error: null,
    });

    await useAuthStore.getState().signUp("a@b.com", "password123");

    expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
    expect(useAuthStore.getState().error).toBeNull();
    expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
  });

  it("flags needsEmailConfirmation when sign up succeeds without an active session", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" }, session: null },
      error: null,
    });

    await useAuthStore.getState().signUp("a@b.com", "password123");

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().needsEmailConfirmation).toBe(true);
  });

  it("sets an error message on sign up failure without setting a user", async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: "Email already registered" } });

    await useAuthStore.getState().signUp("a@b.com", "password123");

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe("Email already registered");
  });

  it("sets the user on successful sign in", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });

    await useAuthStore.getState().signIn("a@b.com", "password123");

    expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
  });

  it("sets an error message on sign in failure", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid credentials" } });

    await useAuthStore.getState().signIn("a@b.com", "wrong-password");

    expect(useAuthStore.getState().error).toBe("Invalid credentials");
  });

  it("clears the user and last synced time on sign out", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never, lastSyncedAt: "2026-07-21T00:00:00.000Z" });
    mockSignOut.mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().lastSyncedAt).toBeNull();
  });

  it("runs a full sync and records the timestamp when signed in", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never });

    await useAuthStore.getState().sync();

    expect(mockRunFullSync).toHaveBeenCalledWith("u1");
    expect(useAuthStore.getState().syncing).toBe(false);
    expect(useAuthStore.getState().lastSyncedAt).not.toBeNull();
  });

  it("does not attempt to sync when signed out", async () => {
    await useAuthStore.getState().sync();

    expect(mockRunFullSync).not.toHaveBeenCalled();
  });

  it("records an error message when sync fails", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never });
    mockRunFullSync.mockRejectedValue(new Error("Network unreachable"));

    await useAuthStore.getState().sync();

    expect(useAuthStore.getState().error).toBe("Network unreachable");
    expect(useAuthStore.getState().syncing).toBe(false);
  });
});
