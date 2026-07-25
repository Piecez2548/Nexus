import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPin, generateSalt } from "@/features/lock/utils/pinHash";

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

interface AppLockState {
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
        const { pinHash, salt } = get();
        if (pinHash === null || salt === null) return false;

        const candidate = await hashPin(pin, salt);
        if (candidate !== pinHash) return false;

        writeSessionUnlocked(true);
        set({
          sessionUnlocked: true,
          rememberUntil: remember ? Date.now() + REMEMBER_DURATION_MS : null,
        });
        return true;
      },

      lock() {
        writeSessionUnlocked(false);
        set({ sessionUnlocked: false, rememberUntil: null });
      },

      async changePin(currentPin, newPin) {
        const { pinHash, salt } = get();
        if (pinHash === null || salt === null) return false;

        const candidate = await hashPin(currentPin, salt);
        if (candidate !== pinHash) return false;

        const newSalt = generateSalt();
        const newHash = await hashPin(newPin, newSalt);
        set({ pinHash: newHash, salt: newSalt });
        return true;
      },

      async disableLock(currentPin) {
        const { pinHash, salt } = get();
        if (pinHash === null || salt === null) return false;

        const candidate = await hashPin(currentPin, salt);
        if (candidate !== pinHash) return false;

        writeSessionUnlocked(false);
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
    }),
    {
      name: "nexus-app-lock",
      partialize: (state) => ({
        pinHash: state.pinHash,
        salt: state.salt,
        autoLockMinutes: state.autoLockMinutes,
        rememberUntil: state.rememberUntil,
      }),
    }
  )
);
