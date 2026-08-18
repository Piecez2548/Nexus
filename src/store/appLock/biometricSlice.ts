import type { StateCreator, StoreApi } from "zustand";
import { hashPin } from "@/features/lock/utils/pinHash";
import { storeBiometricCredential, deleteBiometricCredential } from "@/features/lock/services/biometricService";
import { recordAudit } from "@/features/security/auditLog";
import type { AppLockState, BiometricSlice } from "./types";

// Re-stores the biometric credential under a just-changed PIN. Fails
// closed: if the native re-store throws, disables biometric and
// best-effort deletes any stale credential rather than leave one that
// would silently unlock with the *old* PIN. Never blocks the PIN change
// itself — the caller has already committed the new PIN by the time this
// runs.
export async function resyncBiometricCredential(
  get: StoreApi<AppLockState>["getState"],
  set: StoreApi<AppLockState>["setState"],
  newPin: string
): Promise<void> {
  if (!get().biometricEnabled) return;

  try {
    await storeBiometricCredential(newPin);
  } catch {
    set({ biometricEnabled: false });
    await deleteBiometricCredential();
  }
}

export const createBiometricSlice: StateCreator<AppLockState, [], [], BiometricSlice> = (set, get) => ({
  biometricEnabled: false,

  async enableBiometric(pin) {
    const { pinHash, salt } = get();
    if (pinHash === null || salt === null) return false;

    const candidate = await hashPin(pin, salt);
    if (candidate !== pinHash) return false;

    await storeBiometricCredential(pin);
    set({ biometricEnabled: true });
    recordAudit("lock", "biometric-enabled");
    return true;
  },

  async disableBiometric() {
    await deleteBiometricCredential();
    set({ biometricEnabled: false });
    recordAudit("lock", "biometric-disabled");
  },
});
