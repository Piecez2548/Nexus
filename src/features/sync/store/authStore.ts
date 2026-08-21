import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { runFullSync } from "@/features/sync/syncEngine";
import { toErrorMessage } from "@/utils/asyncState";
import { recordAudit } from "@/features/security/auditLog";
import { resolveMfaAccess, verifyTotpCode } from "@/features/sync/mfa";
import { redeemBackupCode } from "@/features/sync/backupCodes";
import { markMfaVerifiedThisSession, clearMfaSessionFlag } from "@/features/sync/mfaSession";

interface AuthState {
  user: User | null;
  initialized: boolean;
  // True once we definitively know whether a session exists — distinct from
  // `initialized`, which flips true synchronously as a re-entrancy guard
  // before the async session check even starts. The auth gate waits on this
  // one so it doesn't flash the login screen before a valid session loads.
  sessionChecked: boolean;
  loading: boolean;
  error: string | null;
  needsEmailConfirmation: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;

  // A password step succeeded but the account has a verified TOTP factor
  // this browser session hasn't satisfied yet -- AuthGate shows
  // MfaChallengeScreen instead of protected content while this is true.
  // `user` stays null throughout, matching every other "not signed in yet"
  // state this store already has.
  mfaPending: boolean;
  mfaFactorId: string | null;
  mfaError: string | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sync: () => Promise<void>;
  verifyMfaCode: (code: string) => Promise<void>;
  verifyBackupCode: (code: string) => Promise<void>;
  cancelMfaChallenge: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  async initialize() {
    if (get().initialized) return;
    set({ initialized: true });

    if (!isSyncConfigured || !supabase) {
      set({ sessionChecked: true });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const access = await resolveMfaAccess(data.session?.user ?? null);
    set({ user: access.user, mfaPending: access.mfaPending, mfaFactorId: access.mfaFactorId, sessionChecked: true });

    // Async on purpose: Supabase doesn't wait for this callback, and every
    // session change (including one that arrives mid-MFA-challenge) must go
    // through the same resolveMfaAccess gate `initialize()` itself just
    // used above -- setting `user` here unconditionally from `session.user`
    // would otherwise let a password-only session race past the challenge
    // the moment signInWithPassword establishes it, before signIn()'s own
    // code even resumes.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextAccess = await resolveMfaAccess(session?.user ?? null);
      set({ user: nextAccess.user, mfaPending: nextAccess.mfaPending, mfaFactorId: nextAccess.mfaFactorId });
      if (nextAccess.user) get().sync();
    });

    if (access.user) {
      get().sync();
    }
  },

  async signUp(email, password) {
    if (!supabase) return;

    set({ loading: true, error: null, needsEmailConfirmation: false });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      recordAudit("auth", "sign-up", { success: false });
      set({ loading: false, error: error.message });
      return;
    }

    // With email confirmation enabled on the Supabase project, signUp
    // succeeds but returns no session until the link is clicked.
    if (!data.session) {
      recordAudit("auth", "sign-up", { success: true, needsEmailConfirmation: true });
      set({ loading: false, needsEmailConfirmation: true });
      return;
    }

    recordAudit("auth", "sign-up", { success: true });
    set({ loading: false, user: data.user });
  },

  async signIn(email, password) {
    if (!supabase) return;

    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      recordAudit("auth", "sign-in", { success: false });
      set({ loading: false, error: error.message });
      return;
    }

    const access = await resolveMfaAccess(data.user);

    if (access.mfaPending) {
      recordAudit("auth", "sign-in", { success: true, mfaRequired: true });
      set({ loading: false, user: null, mfaPending: true, mfaFactorId: access.mfaFactorId, mfaError: null });
      return;
    }

    recordAudit("auth", "sign-in", { success: true });
    set({ loading: false, user: data.user });
  },

  async signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    clearMfaSessionFlag();
    recordAudit("auth", "sign-out");
    set({ user: null, lastSyncedAt: null, mfaPending: false, mfaFactorId: null, mfaError: null });
  },

  async sync() {
    const { user, syncing } = get();
    if (!user || syncing) return;

    set({ syncing: true, error: null });

    try {
      await runFullSync(user.id);
      set({ syncing: false, lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: toErrorMessage(err, "Sync failed") });
    }
  },

  async verifyMfaCode(code) {
    const { mfaFactorId } = get();
    if (!supabase || !mfaFactorId) return;

    try {
      await verifyTotpCode(mfaFactorId, code);
      const { data } = await supabase.auth.getSession();
      const verifiedUser = data.session?.user ?? null;
      if (verifiedUser) markMfaVerifiedThisSession(verifiedUser.id);
      recordAudit("auth", "mfa-verify", { success: true, method: "totp" });
      set({ user: verifiedUser, mfaPending: false, mfaFactorId: null, mfaError: null });
    } catch (err) {
      recordAudit("auth", "mfa-verify", { success: false, method: "totp" });
      set({ mfaError: toErrorMessage(err, "Invalid code") });
    }
  },

  async verifyBackupCode(code) {
    const { mfaFactorId } = get();
    if (!supabase || !mfaFactorId) return;

    // The pending session already carries the (as-yet-withheld) user id --
    // getSession() still returns it even while mfaPending holds `user`
    // itself back, since Supabase's own session isn't blocked on our
    // client-side gate.
    const { data } = await supabase.auth.getSession();
    const pendingUser = data.session?.user ?? null;

    if (!pendingUser) {
      set({ mfaError: "Session expired, please sign in again" });
      return;
    }

    const ok = await redeemBackupCode(pendingUser.id, code);

    if (!ok) {
      recordAudit("auth", "mfa-verify", { success: false, method: "backup-code" });
      set({ mfaError: "Invalid or already-used backup code" });
      return;
    }

    markMfaVerifiedThisSession(pendingUser.id);
    recordAudit("auth", "mfa-verify", { success: true, method: "backup-code" });
    set({ user: pendingUser, mfaPending: false, mfaFactorId: null, mfaError: null });
  },

  async cancelMfaChallenge() {
    if (!supabase) return;

    // The password-authenticated-but-not-yet-MFA-verified session must not
    // be left half-authenticated -- sign it out entirely so cancelling
    // returns cleanly to the plain sign-in form.
    await supabase.auth.signOut();
    set({ mfaPending: false, mfaFactorId: null, mfaError: null });
  },
}));
