import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { isMfaVerifiedThisSession } from "@/features/sync/mfaSession";
import { recordAudit } from "@/features/security/auditLog";

export interface MfaAccess {
  user: User | null;
  mfaPending: boolean;
  mfaFactorId: string | null;
}

export interface TotpEnrollment {
  factorId: string;
  qrCodeDataUri: string;
  secret: string;
}

// Given a raw, password-authenticated user, decides whether the app may
// treat them as fully signed in or must hold them back for an MFA
// challenge. `listFactors()`'s own `totp` array is already pre-filtered to
// verified factors only (Supabase's own typing: Factor<'totp','verified'>),
// so an unconfirmed, still-mid-enrollment factor never triggers a
// challenge.
export async function resolveMfaAccess(rawUser: User | null): Promise<MfaAccess> {
  if (!rawUser || !supabase) return { user: rawUser, mfaPending: false, mfaFactorId: null };

  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp[0] ?? null;

  if (!verified || isMfaVerifiedThisSession(rawUser.id)) {
    return { user: rawUser, mfaPending: false, mfaFactorId: null };
  }

  return { user: null, mfaPending: true, mfaFactorId: verified.id };
}

// For Settings: is 2FA currently on for this account, and if so, what's its
// factor id (needed to disable/regenerate). Deliberately doesn't consider
// the session-verified flag the way resolveMfaAccess does -- reaching
// Settings at all already implies AuthGate let this session through.
export async function getVerifiedTotpFactor(): Promise<{ id: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp[0] ?? null;
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  if (!supabase) throw new Error("Sync is not configured");

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;

  // qr_code is the raw SVG markup, not a ready data: URI -- Supabase's own
  // doc comment says to prepend this exact prefix before rendering.
  return { factorId: data.id, qrCodeDataUri: `data:image/svg+xml;utf-8,${data.totp.qr_code}`, secret: data.totp.secret };
}

// Raw primitive, deliberately audit-free -- used by two different callers
// with two different logging needs: authStore.ts's verifyMfaCode (sign-in
// challenge, logs "mfa-verify") and completeTotpEnrollment below
// (enrollment confirmation, logs "mfa-enroll"). Supabase's
// challengeAndVerify() is the same call either way; only the audit framing
// differs by context.
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error("Sync is not configured");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
}

// Confirms a freshly enrolled (still-unverified) factor -- the enrollment
// wizard's second step. Kept separate from verifyTotpCode so the audit
// entry it records reads as "you turned 2FA on," not "you signed in."
export async function completeTotpEnrollment(factorId: string, code: string): Promise<void> {
  try {
    await verifyTotpCode(factorId, code);
    recordAudit("auth", "mfa-enroll", { success: true });
  } catch (err) {
    recordAudit("auth", "mfa-enroll", { success: false });
    throw err;
  }
}

export async function unenrollTotp(factorId: string): Promise<void> {
  if (!supabase) throw new Error("Sync is not configured");
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    recordAudit("auth", "mfa-unenroll", { success: false });
    throw error;
  }
  recordAudit("auth", "mfa-unenroll", { success: true });
}
