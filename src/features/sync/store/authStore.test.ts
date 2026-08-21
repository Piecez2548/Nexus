import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearAuditLog, getAuditLog } from "@/features/security/auditLog";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRunFullSync = vi.fn();
const mockListFactors = vi.fn();
const mockChallengeAndVerify = vi.fn();
const mockRedeemBackupCode = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
        challengeAndVerify: (...args: unknown[]) => mockChallengeAndVerify(...args),
      },
    },
  },
}));

vi.mock("@/features/sync/syncEngine", () => ({
  runFullSync: (...args: unknown[]) => mockRunFullSync(...args),
}));

vi.mock("@/features/sync/backupCodes", () => ({
  redeemBackupCode: (...args: unknown[]) => mockRedeemBackupCode(...args),
}));

const { useAuthStore } = await import("./authStore");

describe("authStore", () => {
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
      emailVerificationPending: false,
      pendingVerificationEmail: null,
      emailVerificationError: null,
    });
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset().mockResolvedValue({ error: null });
    mockGetSession.mockReset().mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReset();
    mockRunFullSync.mockReset().mockResolvedValue(undefined);
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
    mockChallengeAndVerify.mockReset();
    mockRedeemBackupCode.mockReset();
    mockVerifyOtp.mockReset();
    mockResend.mockReset();
    sessionStorage.clear();
    clearAuditLog();
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
    expect(mockSignUp).toHaveBeenCalledWith({ email: "a@b.com", password: "password123" });
  });

  it("passes first/last name and phone as Supabase user metadata when a profile is given", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" }, session: { access_token: "token" } },
      error: null,
    });

    await useAuthStore.getState().signUp("a@b.com", "password123", { firstName: "Ada", lastName: "Lovelace", phone: "+66812345678" });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123",
      options: { data: { first_name: "Ada", last_name: "Lovelace", phone: "+66812345678" } },
    });
  });

  it("flags needsEmailConfirmation and emailVerificationPending when sign up succeeds without an active session", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com", identities: [{ id: "i1" }] }, session: null },
      error: null,
    });

    await useAuthStore.getState().signUp("a@b.com", "password123");

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().needsEmailConfirmation).toBe(true);
    expect(useAuthStore.getState().emailVerificationPending).toBe(true);
    expect(useAuthStore.getState().pendingVerificationEmail).toBe("a@b.com");
  });

  it("rejects sign up with a duplicate-account error when Supabase returns an empty identities array", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "fake-id", email: "a@b.com", identities: [] }, session: null },
      error: null,
    });

    await useAuthStore.getState().signUp("a@b.com", "password123");

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe("An account with this email already exists");
    expect(useAuthStore.getState().emailVerificationPending).toBe(false);
    expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
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

  it("records an auth audit event on sign-in success and failure, never including the email/password", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });
    await useAuthStore.getState().signIn("a@b.com", "password123");

    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid credentials" } });
    await useAuthStore.getState().signIn("a@b.com", "wrong-password");

    const events = getAuditLog().filter((e) => e.type === "auth");
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ action: "sign-in", detail: { success: true } });
    expect(events[1]).toMatchObject({ action: "sign-in", detail: { success: false } });
    expect(JSON.stringify(events)).not.toContain("a@b.com");
    expect(JSON.stringify(events)).not.toContain("password123");
  });

  it("clears the user and last synced time on sign out", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never, lastSyncedAt: "2026-07-21T00:00:00.000Z" });
    mockSignOut.mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().lastSyncedAt).toBeNull();
    expect(getAuditLog().some((e) => e.type === "auth" && e.action === "sign-out")).toBe(true);
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

  it("ignores a second sync call while one is already in flight", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never });

    let resolveFirstSync: () => void = () => {};
    mockRunFullSync.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveFirstSync = resolve;
      })
    );

    // Simulates the periodic background sync or a "back online" event firing
    // while a manual "Sync Now" click is still in flight — both call sync()
    // directly, with no UI-level disabled state to stop the second one.
    const firstCall = useAuthStore.getState().sync();
    await useAuthStore.getState().sync();

    expect(mockRunFullSync).toHaveBeenCalledTimes(1);

    resolveFirstSync();
    await firstCall;
  });

  it("records an error message when sync fails", async () => {
    useAuthStore.setState({ user: { id: "u1" } as never });
    mockRunFullSync.mockRejectedValue(new Error("Network unreachable"));

    await useAuthStore.getState().sync();

    expect(useAuthStore.getState().error).toBe("Network unreachable");
    expect(useAuthStore.getState().syncing).toBe(false);
  });

  it("loads the existing session and marks sessionChecked once initialize resolves", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    expect(useAuthStore.getState().sessionChecked).toBe(false);
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
    expect(useAuthStore.getState().sessionChecked).toBe(true);
  });

  it("does not re-run the session check on a second initialize call", async () => {
    await useAuthStore.getState().initialize();
    await useAuthStore.getState().initialize();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  describe("MFA", () => {
    it("withholds the user and sets mfaPending on signIn when a verified TOTP factor exists", async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });
      mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });

      await useAuthStore.getState().signIn("a@b.com", "password123");

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().mfaPending).toBe(true);
      expect(useAuthStore.getState().mfaFactorId).toBe("factor-1");

      const events = getAuditLog().filter((e) => e.type === "auth" && e.action === "sign-in");
      expect(events[0]).toMatchObject({ detail: { success: true, mfaRequired: true } });
    });

    it("verifyMfaCode grants access and clears mfaPending on a correct code", async () => {
      useAuthStore.setState({ mfaPending: true, mfaFactorId: "factor-1" });
      mockChallengeAndVerify.mockResolvedValue({ data: {}, error: null });
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "a@b.com" } } } });

      await useAuthStore.getState().verifyMfaCode("123456");

      expect(mockChallengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
      expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
      expect(useAuthStore.getState().mfaPending).toBe(false);
      expect(useAuthStore.getState().mfaFactorId).toBeNull();
      expect(sessionStorage.getItem("nexus-mfa-verified-user-id")).toBe("u1");
      expect(getAuditLog().some((e) => e.action === "mfa-verify" && e.detail?.success === true)).toBe(true);
    });

    it("verifyMfaCode keeps mfaPending and sets mfaError on an incorrect code", async () => {
      useAuthStore.setState({ mfaPending: true, mfaFactorId: "factor-1" });
      mockChallengeAndVerify.mockResolvedValue({ data: null, error: { message: "Invalid code" } });

      await useAuthStore.getState().verifyMfaCode("000000");

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().mfaPending).toBe(true);
      expect(useAuthStore.getState().mfaError).toBe("Invalid code");
      expect(getAuditLog().some((e) => e.action === "mfa-verify" && e.detail?.success === false)).toBe(true);
    });

    it("verifyBackupCode grants access and clears mfaPending on a valid code", async () => {
      useAuthStore.setState({ mfaPending: true, mfaFactorId: "factor-1" });
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "a@b.com" } } } });
      mockRedeemBackupCode.mockResolvedValue(true);

      await useAuthStore.getState().verifyBackupCode("ABCDE-FGHJK");

      expect(mockRedeemBackupCode).toHaveBeenCalledWith("u1", "ABCDE-FGHJK");
      expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
      expect(useAuthStore.getState().mfaPending).toBe(false);
      expect(sessionStorage.getItem("nexus-mfa-verified-user-id")).toBe("u1");
    });

    it("verifyBackupCode keeps mfaPending and sets mfaError on an invalid/already-used code", async () => {
      useAuthStore.setState({ mfaPending: true, mfaFactorId: "factor-1" });
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "a@b.com" } } } });
      mockRedeemBackupCode.mockResolvedValue(false);

      await useAuthStore.getState().verifyBackupCode("ZZZZZ-ZZZZZ");

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().mfaPending).toBe(true);
      expect(useAuthStore.getState().mfaError).not.toBeNull();
    });

    it("cancelMfaChallenge signs out and clears the mfa challenge state", async () => {
      useAuthStore.setState({ mfaPending: true, mfaFactorId: "factor-1", mfaError: "Invalid code" });

      await useAuthStore.getState().cancelMfaChallenge();

      expect(mockSignOut).toHaveBeenCalled();
      expect(useAuthStore.getState().mfaPending).toBe(false);
      expect(useAuthStore.getState().mfaFactorId).toBeNull();
      expect(useAuthStore.getState().mfaError).toBeNull();
    });

    it("signOut clears the session-verified MFA flag", async () => {
      useAuthStore.setState({ user: { id: "u1" } as never });
      sessionStorage.setItem("nexus-mfa-verified-user-id", "u1");

      await useAuthStore.getState().signOut();

      expect(sessionStorage.getItem("nexus-mfa-verified-user-id")).toBeNull();
    });

    // The actual bug this feature exists to prevent: onAuthStateChange
    // fires independently of signIn()'s own code, as soon as
    // signInWithPassword establishes a session. If this listener ever goes
    // back to setting `user` directly from the session without going
    // through resolveMfaAccess, a password-only session would race past
    // the MFA challenge the moment Supabase's client fires this event.
    it("initialize()'s onAuthStateChange listener withholds the user when a verified factor exists", async () => {
      mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });

      await useAuthStore.getState().initialize();
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

      const listener = mockOnAuthStateChange.mock.calls[0]![0] as (event: string, session: unknown) => Promise<void>;
      await listener("SIGNED_IN", { user: { id: "u1", email: "a@b.com" } });

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().mfaPending).toBe(true);
      expect(useAuthStore.getState().mfaFactorId).toBe("factor-1");
    });

    it("initialize()'s getSession() path also withholds the user when a verified factor exists", async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "a@b.com" } } } });
      mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().mfaPending).toBe(true);
      expect(useAuthStore.getState().sessionChecked).toBe(true);
    });
  });

  describe("Email verification (OTP sign-up)", () => {
    it("verifyEmailOtp grants access and clears all pending/error state on a correct code", async () => {
      useAuthStore.setState({ emailVerificationPending: true, pendingVerificationEmail: "a@b.com", needsEmailConfirmation: true });
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });

      await useAuthStore.getState().verifyEmailOtp("123456");

      expect(mockVerifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "123456", type: "signup" });
      expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
      expect(useAuthStore.getState().emailVerificationPending).toBe(false);
      expect(useAuthStore.getState().pendingVerificationEmail).toBeNull();
      expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
      expect(getAuditLog().some((e) => e.action === "email-verify" && e.detail?.success === true)).toBe(true);
    });

    it("verifyEmailOtp keeps pending state and sets emailVerificationError on an incorrect code", async () => {
      useAuthStore.setState({ emailVerificationPending: true, pendingVerificationEmail: "a@b.com" });
      mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "Token has expired or is invalid" } });

      await useAuthStore.getState().verifyEmailOtp("000000");

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().emailVerificationPending).toBe(true);
      expect(useAuthStore.getState().emailVerificationError).toBe("Token has expired or is invalid");
      expect(getAuditLog().some((e) => e.action === "email-verify" && e.detail?.success === false)).toBe(true);
    });

    it("resendEmailVerification clears a prior error on success", async () => {
      useAuthStore.setState({ pendingVerificationEmail: "a@b.com", emailVerificationError: "stale error" });
      mockResend.mockResolvedValue({ data: {}, error: null });

      await useAuthStore.getState().resendEmailVerification();

      expect(mockResend).toHaveBeenCalledWith({ type: "signup", email: "a@b.com" });
      expect(useAuthStore.getState().emailVerificationError).toBeNull();
    });

    it("resendEmailVerification surfaces a rate-limit or other error from Supabase", async () => {
      useAuthStore.setState({ pendingVerificationEmail: "a@b.com" });
      mockResend.mockResolvedValue({ data: null, error: { message: "For security purposes, wait before retrying" } });

      await useAuthStore.getState().resendEmailVerification();

      expect(useAuthStore.getState().emailVerificationError).toBe("For security purposes, wait before retrying");
    });

    it("cancelEmailVerification resets all pending state without signing out", () => {
      useAuthStore.setState({
        emailVerificationPending: true,
        pendingVerificationEmail: "a@b.com",
        emailVerificationError: "some error",
        needsEmailConfirmation: true,
      });

      useAuthStore.getState().cancelEmailVerification();

      expect(useAuthStore.getState().emailVerificationPending).toBe(false);
      expect(useAuthStore.getState().pendingVerificationEmail).toBeNull();
      expect(useAuthStore.getState().emailVerificationError).toBeNull();
      expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });
});
