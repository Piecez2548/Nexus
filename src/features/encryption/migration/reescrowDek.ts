import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import {
  deriveKek,
  wrapDek,
  generateRandomBytes,
  bytesToBase64,
  PBKDF2_ITERATIONS,
} from "@/features/encryption/crypto/encryption";

export class ReescrowFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReescrowFailedError";
  }
}

// Repairs a broken recovery path: re-wraps the DEK already resident on THIS
// device (proven correct — this device is unlocked and reading real data
// with it) using a freshly-verified account password, and overwrites
// whatever escrow currently sits on the server. Exists for the case where
// the original escrow was created with a since-forgotten mistyped account
// password — every other device's "Forgot PIN" / cross-device recovery
// would otherwise be permanently broken with no way to fix it, since the
// original (wrong) password that produced it is unknown and unrecoverable.
export async function reescrowDek(accountPassword: string): Promise<void> {
  if (!isSyncConfigured || !supabase) {
    throw new ReescrowFailedError("ต้องเชื่อมต่อ Sync กับบัญชีก่อนจึงจะอัปเดตกุญแจสำรองได้");
  }

  const user = useAuthStore.getState().user;
  if (!user?.email) {
    throw new ReescrowFailedError("ต้องเข้าสู่ระบบก่อน");
  }

  const dek = useEncryptionSessionStore.getState().dek;
  if (!dek) {
    throw new ReescrowFailedError("อุปกรณ์นี้ต้องปลดล็อกด้วย PIN ก่อน จึงจะอัปเดตกุญแจสำรองได้");
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: accountPassword,
  });
  if (verifyError) {
    throw new ReescrowFailedError("รหัสผ่านบัญชี Sync ไม่ถูกต้อง");
  }

  const escrowSalt = generateRandomBytes(16);
  const escrowKek = await deriveKek(accountPassword, escrowSalt, PBKDF2_ITERATIONS);
  const wrapped = await wrapDek(dek, escrowKek);

  const { error } = await supabase.from("user_encryption_keys").upsert({
    user_id: user.id,
    wrapped_dek: wrapped.wrapped,
    dek_iv: wrapped.iv,
    escrow_salt: bytesToBase64(escrowSalt),
    escrow_iterations: PBKDF2_ITERATIONS,
  });

  if (error) throw error;
}
