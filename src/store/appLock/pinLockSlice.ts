import type { StateCreator } from "zustand";
import { hashPin, generateSalt } from "@/features/lock/utils/pinHash";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { deleteBiometricCredential } from "@/features/lock/services/biometricService";
import { recordAudit } from "@/features/security/auditLog";
import { resyncBiometricCredential } from "./biometricSlice";
import { unwrapDekForUnlock, wrapDekForPin } from "./encryptionKeySlice";
import type { AppLockState, PinLockSlice } from "./types";

const SESSION_KEY = "nexus-session-unlocked";
const REMEMBER_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

export const createPinLockSlice: StateCreator<AppLockState, [], [], PinLockSlice> = (set, get) => ({
  pinHash: null,
  salt: null,
  autoLockMinutes: 0,
  rememberUntil: null,
  sessionUnlocked: readSessionUnlocked(),
  lastActivityAt: Date.now(),

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
    recordAudit("lock", "pin-setup");
  },

  async unlock(pin, remember) {
    const { pinHash, salt } = get();
    if (pinHash === null || salt === null) return false;

    const candidate = await hashPin(pin, salt);
    if (candidate !== pinHash) {
      // The security-relevant signal an audit log exists for — repeated
      // failed unlock attempts. Successful unlocks are deliberately not
      // logged (they'd happen many times a day and add noise, not signal).
      recordAudit("lock", "unlock-failed");
      return false;
    }

    await unwrapDekForUnlock(get, pin);

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

      const { wrappedDek, kekSalt, kekIterations } = await wrapDekForPin(newPin, dek);

      const newSalt = generateSalt();
      const newHash = await hashPin(newPin, newSalt);
      set({
        pinHash: newHash,
        salt: newSalt,
        wrappedDek,
        kekSalt,
        kekIterations,
      });
      await resyncBiometricCredential(get, set, newPin);
      recordAudit("lock", "pin-changed");
      return true;
    }

    const newSalt = generateSalt();
    const newHash = await hashPin(newPin, newSalt);
    set({ pinHash: newHash, salt: newSalt });
    await resyncBiometricCredential(get, set, newPin);
    recordAudit("lock", "pin-changed");
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

    await deleteBiometricCredential();
    writeSessionUnlocked(false);
    useEncryptionSessionStore.getState().clearDek();
    set({ pinHash: null, salt: null, rememberUntil: null, sessionUnlocked: false, biometricEnabled: false });
    recordAudit("lock", "disabled");
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

  async completeRecovery(newPin, dek) {
    const salt = generateSalt();
    const pinHash = await hashPin(newPin, salt);

    const { wrappedDek, kekSalt, kekIterations } = await wrapDekForPin(newPin, dek);

    // There's no old PIN in scope to re-verify (that's the entire point
    // of recovery), so any biometric credential from before this is now
    // permanently stale — drop it unconditionally. The user re-enables
    // biometric in one tap afterward if they want it.
    await deleteBiometricCredential();

    writeSessionUnlocked(true);
    useEncryptionSessionStore.getState().setDek(dek);
    set({
      pinHash,
      salt,
      encryptionEnabled: true,
      wrappedDek,
      kekSalt,
      kekIterations,
      sessionUnlocked: true,
      rememberUntil: null,
      biometricEnabled: false,
    });
  },
});
