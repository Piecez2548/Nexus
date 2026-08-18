import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppLockState } from "./appLock/types";
import { createPinLockSlice } from "./appLock/pinLockSlice";
import { createBiometricSlice } from "./appLock/biometricSlice";
import { createEncryptionKeySlice } from "./appLock/encryptionKeySlice";

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
      partialize: (state) => ({
        pinHash: state.pinHash,
        salt: state.salt,
        autoLockMinutes: state.autoLockMinutes,
        rememberUntil: state.rememberUntil,
        encryptionEnabled: state.encryptionEnabled,
        wrappedDek: state.wrappedDek,
        kekSalt: state.kekSalt,
        kekIterations: state.kekIterations,
        biometricEnabled: state.biometricEnabled,
      }),
    }
  )
);
