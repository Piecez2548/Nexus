// Tracks whether the current browser session has already satisfied MFA for
// a given user. sessionStorage, not localStorage: this must not survive a
// browser restart -- a fresh session should always re-prompt, matching the
// security bar of a fresh sign-in.
//
// Why this exists instead of relying on Supabase's own
// auth.mfa.getAuthenticatorAssuranceLevel(): that API only reflects
// Supabase-native factor verification (TOTP challengeAndVerify). A backup
// code (mfa.ts's sibling, backupCodes.ts) is a custom mechanism -- our own
// Postgres table, not a Supabase MFA factor type -- so a successful backup
// code redemption would never change Supabase's own AAL. Checking
// getAuthenticatorAssuranceLevel() after a backup-code redemption would
// still report "needs aal2" and re-prompt in a loop on the very next
// initialize()/onAuthStateChange firing. Tracking satisfaction ourselves,
// uniformly for both paths, avoids that entirely.
const SESSION_KEY = "nexus-mfa-verified-user-id";

export function markMfaVerifiedThisSession(userId: string): void {
  sessionStorage.setItem(SESSION_KEY, userId);
}

export function isMfaVerifiedThisSession(userId: string): boolean {
  return sessionStorage.getItem(SESSION_KEY) === userId;
}

export function clearMfaSessionFlag(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
