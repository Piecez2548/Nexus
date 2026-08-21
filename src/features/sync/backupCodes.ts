import { supabase } from "@/lib/supabaseClient";
import { hashPin, generateSalt } from "@/features/lock/utils/pinHash";
import { recordAudit } from "@/features/security/auditLog";

// Two-factor recovery codes for cloud sync (Layer 2 only -- see
// docs/SECURITY.md). A backup code is a high-entropy random secret, not a
// human-chosen PIN, so reusing hashPin/generateSalt's salted-SHA-256
// approach here is appropriate (unlike for a PIN, there's no
// low-iteration-count-vs-offline-brute-force tradeoff to worry about: the
// code's own entropy is what resists guessing). Verified entirely
// client-side against the `mfa_backup_codes` table (supabase/schema.sql) --
// this app has no custom backend, so every other client-verified secret
// works the same way.

const CODE_LENGTH = 10;
const BACKUP_CODE_COUNT = 10;
// No symbols, no ambiguous 0/O or 1/I -- codes are hand-copied/written down.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCanonicalCode(): string {
  const randomValues = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(randomValues);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[randomValues[i]! % CHARSET.length];
  }
  return code;
}

// Display-only grouping for readability -- the stored hash is always over
// the canonical (undashed) form, so formatting never affects verification.
export function formatBackupCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

function normalizeBackupCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

// Replaces this user's entire set of backup codes with a fresh batch.
// Returns the plaintext, display-formatted codes -- shown to the user
// exactly once; never persisted or logged in plaintext anywhere.
export async function generateBackupCodes(userId: string, count = BACKUP_CODE_COUNT): Promise<string[]> {
  if (!supabase) throw new Error("Sync is not configured");

  const canonicalCodes = Array.from({ length: count }, () => generateCanonicalCode());

  const rows = await Promise.all(
    canonicalCodes.map(async (code) => {
      const salt = generateSalt();
      const codeHash = await hashPin(code, salt);
      return { user_id: userId, code_hash: codeHash, salt };
    })
  );

  await supabase.from("mfa_backup_codes").delete().eq("user_id", userId);
  const { error } = await supabase.from("mfa_backup_codes").insert(rows);
  if (error) throw error;

  recordAudit("auth", "mfa-backup-codes-generated", { count });
  return canonicalCodes.map(formatBackupCode);
}

// Matches the entered code against this user's unused codes and, on a
// match, marks that row used so it can never be redeemed again. Returns
// whether a match was found and consumed.
export async function redeemBackupCode(userId: string, code: string): Promise<boolean> {
  if (!supabase) return false;

  const normalized = normalizeBackupCode(code);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("mfa_backup_codes")
    .select("id, code_hash, salt")
    .eq("user_id", userId)
    .is("used_at", null);

  if (error || !data) return false;

  for (const row of data as { id: string; code_hash: string; salt: string }[]) {
    const candidateHash = await hashPin(normalized, row.salt);
    if (candidateHash !== row.code_hash) continue;

    const { error: updateError } = await supabase
      .from("mfa_backup_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);
    return !updateError;
  }

  return false;
}

export async function countRemainingBackupCodes(userId: string): Promise<number> {
  if (!supabase) return 0;

  const { count } = await supabase
    .from("mfa_backup_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);

  return count ?? 0;
}
