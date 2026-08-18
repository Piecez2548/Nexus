import type { StateCreator, StoreApi } from "zustand";
import { hashPin } from "@/features/lock/utils/pinHash";
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
import type { AppLockState, EncryptionKeySlice } from "./types";

const KEK_SALT_BYTES = 16;

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

// Derives a fresh KEK from the given PIN and wraps the given DEK with it —
// the sequence shared by attachEncryption, changePin's re-wrap, and
// completeRecovery. Never calls set() itself; each caller merges the result
// into its own single atomic set() alongside whatever else it's updating.
export async function wrapDekForPin(
  pin: string,
  dek: CryptoKey
): Promise<{ wrappedDek: WrappedKey; kekSalt: string; kekIterations: number }> {
  const kekSaltBytes = generateRandomBytes(KEK_SALT_BYTES);
  const kek = await deriveKek(pin, kekSaltBytes, PBKDF2_ITERATIONS);
  const wrappedDek = await wrapDek(dek, kek);
  return { wrappedDek, kekSalt: bytesToBase64(kekSaltBytes), kekIterations: PBKDF2_ITERATIONS };
}

// Unwraps the persisted DEK with the given (already PIN-verified) pin and
// restores it into the encryption session store. A no-op when encryption
// isn't enabled. Throws EncryptionStateCorruptedError if the persisted
// wrap state is missing or fails to unwrap.
export async function unwrapDekForUnlock(get: StoreApi<AppLockState>["getState"], pin: string): Promise<void> {
  const { encryptionEnabled, wrappedDek, kekSalt, kekIterations } = get();
  if (!encryptionEnabled) return;

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

export const createEncryptionKeySlice: StateCreator<AppLockState, [], [], EncryptionKeySlice> = (set, get) => ({
  encryptionEnabled: false,
  wrappedDek: null,
  kekSalt: null,
  kekIterations: null,

  async attachEncryption(pin, dek) {
    const { pinHash, salt } = get();
    if (pinHash === null || salt === null) {
      throw new Error("Cannot enable encryption before a PIN is set up");
    }

    const candidate = await hashPin(pin, salt);
    if (candidate !== pinHash) {
      throw new Error("Incorrect PIN");
    }

    const { wrappedDek, kekSalt, kekIterations } = await wrapDekForPin(pin, dek);

    useEncryptionSessionStore.getState().setDek(dek);
    set({
      encryptionEnabled: true,
      wrappedDek,
      kekSalt,
      kekIterations,
    });
  },
});
