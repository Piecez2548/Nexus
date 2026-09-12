import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppLockState } from "./appLock/types";
import { createPinLockSlice } from "./appLock/pinLockSlice";
import { createBiometricSlice } from "./appLock/biometricSlice";
import { createEncryptionKeySlice } from "./appLock/encryptionKeySlice";
import { readLockSignal, sessionIsCurrent } from "./appLock/lockSignal";

export { EncryptionStateCorruptedError } from "./appLock/encryptionKeySlice";

export const useAppLockStore = create<AppLockState>()(
  persist(
    (...a) => ({
      ...createPinLockSlice(...a),
      ...createBiometricSlice(...a),
      ...createEncryptionKeySlice(...a),
    }),
    {
      name: "nexus-app-lock",
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AppLockState>) };
        const signal = readLockSignal();
        const remembered = merged.unlockGeneration === signal?.id && (merged.rememberUntil ?? 0) > Date.now();
        if (signal && !sessionIsCurrent() && !remembered) {
          merged.sessionUnlocked = false;
          merged.rememberUntil = null;
          merged.hubLockRequired = signal.hub || merged.hubLockRequired;
        }
        return merged;
      },
      partialize: (state) => ({
        pinHash: state.pinHash,
        salt: state.salt,
        autoLockMinutes: state.autoLockMinutes,
        rememberUntil: state.rememberUntil,
        hubLockRequired: state.hubLockRequired,
        unlockGeneration: state.unlockGeneration,
        encryptionEnabled: state.encryptionEnabled,
        wrappedDek: state.wrappedDek,
        kekSalt: state.kekSalt,
        kekIterations: state.kekIterations,
        biometricEnabled: state.biometricEnabled,
      }),
    }
  )
);
