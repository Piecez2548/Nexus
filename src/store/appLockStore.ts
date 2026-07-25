import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPin, generateSalt } from "@/features/lock/utils/pinHash";
import {
  deriveKek,
  wrapDek,
  unwrapDek,
  generateRandomBytes,
  bytesToBase64,
  base64ToBytes,
  PBKDF2_ITERATIONS,
  type WrappedKey,
} from "@/features/encryption/crypto/encryption";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";

const SESSION_KEY = "nexus-session-unlocked";
const REMEMBER_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const KEK_SALT_BYTES = 16;

function readSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSessionUnlocked(value: boolean): void {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, "true");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — the app simply
    // won't remember the unlock within the tab; not worth surfacing.
  }
}

// Thrown when the PIN itself checks out (pinHash matches) but the wrapped
// DEK fails to unwrap with it — this is NOT "wrong PIN", it means the
// locally-persisted encryption state is inconsistent/corrupted and needs to
// be surfaced distinctly (e.g. point the user at "Forgot PIN" recovery
// instead of "try again").
export class EncryptionStateCorruptedError extends Error {
  constructor() {
    super("PIN verified but the encryption key could not be unwrapped");
    this.name = "EncryptionStateCorruptedError";
  }
}

interface AppLockState {
  pinHash: string | null;
  salt: string | null;
  autoLockMinutes: number;
  rememberUntil: number | null;
  sessionUnlocked: boolean;
  lastActivityAt: number;

  // Encryption-at-rest fields — all optional/null until the user opts in
  // via the Stage 4 migration flow (see EncryptionSettings). None of this
  // changes behavior for anyone who never enables it.
  encryptionEnabled: boolean;
  wrappedDek: WrappedKey | null;
  kekSalt: string | null; // base64
  kekIterations: number | null;

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

  // Called only by the encryption migration flow once a DEK has been
  // generated and escrowed — wraps the given DEK with a PIN-derived KEK
  // and starts requiring it on unlock. Never generates a new DEK itself.
  attachEncryption: (pin: string, dek: CryptoKey) => Promise<void>;

  // Called only by the "Forgot PIN" recovery flow, after recoverDekFromEscrow
  // has already unwrapped the DEK via the account password. There is no old
  // PIN to verify here (that's the entire point of recovery) — this replaces
  // the PIN outright and re-wraps the *same* recovered DEK, so every row
  // already encrypted with it stays readable.
  completeRecovery: (newPin: string, dek: CryptoKey) => Promise<void>;
}

export const useAppLockStore = create<AppLockState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      salt: null,
      autoLockMinutes: 0,
      rememberUntil: null,
      sessionUnlocked: readSessionUnlocked(),
      lastActivityAt: Date.now(),

      encryptionEnabled: false,
      wrappedDek: null,
      kekSalt: null,
      kekIterations: null,

      isEnabled: () => get().pinHash !== null,

      isLocked: () => {
        const { pinHash, rememberUntil, sessionUnlocked } = get();
        if (pinHash === null) return false;
        if (sessionUnlocked) return false;
        if (rememberUntil !== null && Date.now() < rememberUntil) return false;
        return true;
      },

      async setupPin(pin, remember) {
        const salt = generateSalt();
        const pinHash = await hashPin(pin, salt);

        writeSessionUnlocked(true);
        set({
          pinHash,
          salt,
          sessionUnlocked: true,
          rememberUntil: remember ? Date.now() + REMEMBER_DURATION_MS : null,
        });
      },

      async unlock(pin, remember) {
        const { pinHash, salt, encryptionEnabled, wrappedDek, kekSalt, kekIterations } = get();
        if (pinHash === null || salt === null) return false;

        const candidate = await hashPin(pin, salt);
        if (candidate !== pinHash) return false;

        if (encryptionEnabled) {
          if (wrappedDek === null || kekSalt === null || kekIterations === null) {
            throw new EncryptionStateCorruptedError();
          }

          try {
            const kek = await deriveKek(pin, base64ToBytes(kekSalt), kekIterations);
            const dek = await unwrapDek(wrappedDek, kek);
            useEncryptionSessionStore.getState().setDek(dek);
          } catch {
            throw new EncryptionStateCorruptedError();
          }
        }

        writeSessionUnlocked(true);
        set({
          sessionUnlocked: true,
          rememberUntil: remember ? Date.now() + REMEMBER_DURATION_MS : null,
        });
        return true;
      },

      lock() {
        writeSessionUnlocked(false);
        useEncryptionSessionStore.getState().clearDek();
        set({ sessionUnlocked: false, rememberUntil: null });
      },

      async changePin(currentPin, newPin) {
        const { pinHash, salt, encryptionEnabled } = get();
        if (pinHash === null || salt === null) return false;

        const candidate = await hashPin(currentPin, salt);
        if (candidate !== pinHash) return false;

        if (encryptionEnabled) {
          // Re-wrapping requires the DEK already resident in memory (set at
          // unlock time) — changePin never re-derives it from the old PIN,
          // and it must never generate a new DEK (that would orphan every
          // row already encrypted with the old one).
          const dek = useEncryptionSessionStore.getState().dek;
          if (dek === null) return false;

          const newKekSalt = generateRandomBytes(KEK_SALT_BYTES);
          const newKek = await deriveKek(newPin, newKekSalt, PBKDF2_ITERATIONS);
          const newWrappedDek = await wrapDek(dek, newKek);

          const newSalt = generateSalt();
          const newHash = await hashPin(newPin, newSalt);
          set({
            pinHash: newHash,
            salt: newSalt,
            wrappedDek: newWrappedDek,
            kekSalt: bytesToBase64(newKekSalt),
            kekIterations: PBKDF2_ITERATIONS,
          });
          return true;
        }

        const newSalt = generateSalt();
        const newHash = await hashPin(newPin, newSalt);
        set({ pinHash: newHash, salt: newSalt });
        return true;
      },

      async disableLock(currentPin) {
        const { pinHash, salt, encryptionEnabled } = get();
        if (pinHash === null || salt === null) return false;

        // Disabling App Lock would remove the only PIN that can derive the
        // KEK protecting the DEK — there would be no way to unlock
        // encrypted data again. Encryption must be turned off first
        // (a separate, not-yet-built flow) before the PIN can be removed.
        if (encryptionEnabled) return false;

        const candidate = await hashPin(currentPin, salt);
        if (candidate !== pinHash) return false;

        writeSessionUnlocked(false);
        useEncryptionSessionStore.getState().clearDek();
        set({ pinHash: null, salt: null, rememberUntil: null, sessionUnlocked: false });
        return true;
      },

      setAutoLockMinutes(minutes) {
        set({ autoLockMinutes: minutes });
      },

      recordActivity() {
        set({ lastActivityAt: Date.now() });
      },

      checkAutoLock() {
        const { autoLockMinutes, sessionUnlocked, lastActivityAt } = get();
        if (autoLockMinutes <= 0 || !sessionUnlocked) return;

        const elapsedMs = Date.now() - lastActivityAt;
        if (elapsedMs >= autoLockMinutes * 60 * 1000) {
          get().lock();
        }
      },

      async attachEncryption(pin, dek) {
        const { pinHash, salt } = get();
        if (pinHash === null || salt === null) {
          throw new Error("Cannot enable encryption before a PIN is set up");
        }

        const candidate = await hashPin(pin, salt);
        if (candidate !== pinHash) {
          throw new Error("Incorrect PIN");
        }

        const kekSalt = generateRandomBytes(KEK_SALT_BYTES);
        const kek = await deriveKek(pin, kekSalt, PBKDF2_ITERATIONS);
        const wrappedDek = await wrapDek(dek, kek);

        useEncryptionSessionStore.getState().setDek(dek);
        set({
          encryptionEnabled: true,
          wrappedDek,
          kekSalt: bytesToBase64(kekSalt),
          kekIterations: PBKDF2_ITERATIONS,
        });
      },

      async completeRecovery(newPin, dek) {
        const salt = generateSalt();
        const pinHash = await hashPin(newPin, salt);

        const kekSalt = generateRandomBytes(KEK_SALT_BYTES);
        const kek = await deriveKek(newPin, kekSalt, PBKDF2_ITERATIONS);
        const wrappedDek = await wrapDek(dek, kek);

        writeSessionUnlocked(true);
        useEncryptionSessionStore.getState().setDek(dek);
        set({
          pinHash,
          salt,
          encryptionEnabled: true,
          wrappedDek,
          kekSalt: bytesToBase64(kekSalt),
          kekIterations: PBKDF2_ITERATIONS,
          sessionUnlocked: true,
          rememberUntil: null,
        });
      },
    }),
    {
      name: "nexus-app-lock",
      partialize: (state) => ({
        pinHash: state.pinHash,
        salt: state.salt,
        autoLockMinutes: state.autoLockMinutes,
        rememberUntil: state.rememberUntil,
        encryptionEnabled: state.encryptionEnabled,
        wrappedDek: state.wrappedDek,
        kekSalt: state.kekSalt,
        kekIterations: state.kekIterations,
      }),
    }
  )
);
