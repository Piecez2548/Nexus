import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { useAuthStore } from "@/features/sync/store/authStore";
import { deriveKek, unwrapDek, base64ToBytes } from "@/features/encryption/crypto/encryption";
import type { TranslateFn } from "@/i18n/useTranslation";

// Distinguishes "there's nothing to recover / recovery can't work here"
// from a generic error, so the UI can show a specific message instead of a
// stack trace (e.g. wrong credentials vs. no escrow record at all).
export class RecoveryNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryNotAvailableError";
  }
}

interface EscrowRecord {
  wrapped_dek: string;
  dek_iv: string;
  escrow_salt: string;
  escrow_iterations: number;
}

// Signs in (reusing authStore, so the resulting session is the same one the
// rest of the app already relies on), fetches the DEK escrowed at
// enable-time (see enableEncryption.ts's escrowDek), and unwraps it with a
// key derived from the same account password. This is the "Forgot PIN"
// path: it recovers the DEK without ever needing the old PIN.
export async function recoverDekFromEscrow(email: string, password: string, translate: TranslateFn): Promise<CryptoKey> {
  if (!isSyncConfigured || !supabase) {
    throw new RecoveryNotAvailableError(translate("lock.recoverSyncRequired"));
  }

  await useAuthStore.getState().signIn(email, password);
  const { user, error: signInError } = useAuthStore.getState();
  if (!user) {
    throw new RecoveryNotAvailableError(signInError ?? translate("lock.recoverInvalidCredentials"));
  }

  const { data, error: fetchError } = await supabase
    .from("user_encryption_keys")
    .select("wrapped_dek, dek_iv, escrow_salt, escrow_iterations")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  const record = data as EscrowRecord | null;
  if (!record) {
    throw new RecoveryNotAvailableError(translate("lock.recoverKeyNotFound"));
  }

  const escrowKek = await deriveKek(password, base64ToBytes(record.escrow_salt), record.escrow_iterations);

  try {
    return await unwrapDek({ wrapped: record.wrapped_dek, iv: record.dek_iv }, escrowKek);
  } catch {
    throw new RecoveryNotAvailableError(translate("lock.recoverUnwrapFailed"));
  }
}
