import type { WrappedKey } from "@/features/encryption/crypto/encryption";

export interface PinLockSlice {
  pinHash: string | null;
  salt: string | null;
  autoLockMinutes: number;
  rememberUntil: number | null;
  sessionUnlocked: boolean;
  lastActivityAt: number;

  isEnabled: () => boolean;
  isLocked: () => boolean;

  setupPin: (pin: string, remember: boolean) => Promise<void>;
  unlock: (pin: string, remember: boolean) => Promise<boolean>;
  lock: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  disableLock: (currentPin: string) => Promise<boolean>;
  setAutoLockMinutes: (minutes: number) => void;
  recordActivity: () => void;
  checkAutoLock: () => void;

  // Called only by the "Forgot PIN" recovery flow, after recoverDekFromEscrow
  // has already unwrapped the DEK via the account password. There is no old
  // PIN to verify here (that's the entire point of recovery) — this replaces
  // the PIN outright and re-wraps the *same* recovered DEK, so every row
  // already encrypted with it stays readable.
  completeRecovery: (newPin: string, dek: CryptoKey) => Promise<void>;
}

export interface BiometricSlice {
  // Whether the App Lock PIN is also stored behind a hardware-backed,
  // biometric-gated Keystore credential — a faster alternative to typing
  // the PIN, never a replacement for it (the PIN itself is unaffected).
  biometricEnabled: boolean;

  // Re-verifies the PIN, then stores it behind biometric-gated Keystore
  // storage. Only flips biometricEnabled on success.
  enableBiometric: (pin: string) => Promise<boolean>;
  // Deletes the stored credential and clears the flag. Safe to call even
  // if nothing was ever stored.
  disableBiometric: () => Promise<void>;
}

export interface EncryptionKeySlice {
  // Encryption-at-rest fields — all optional/null until the user opts in
  // via the Stage 4 migration flow (see EncryptionSettings). None of this
  // changes behavior for anyone who never enables it.
  encryptionEnabled: boolean;
  wrappedDek: WrappedKey | null;
  kekSalt: string | null; // base64
  kekIterations: number | null;

  // Called only by the encryption migration flow once a DEK has been
  // generated and escrowed — wraps the given DEK with a PIN-derived KEK
  // and starts requiring it on unlock. Never generates a new DEK itself.
  attachEncryption: (pin: string, dek: CryptoKey) => Promise<void>;

  // Called only by the "Disable Encryption" migration, and only after every
  // row across every encryptable table has been decrypted back to plaintext
  // and verified — never before. Clears the session DEK and every locally
  // wrapped-key field; no PIN/DEK params needed since there's no key
  // material to derive here, only state to clear (PIN verification for the
  // whole disable operation already happened before any data was touched).
  detachEncryption: () => void;
}

export type AppLockState = PinLockSlice & BiometricSlice & EncryptionKeySlice;
