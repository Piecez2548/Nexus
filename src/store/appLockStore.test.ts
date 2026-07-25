import { describe, expect, it, beforeEach } from "vitest";
import { useAppLockStore, EncryptionStateCorruptedError } from "./appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek, encryptField, decryptField } from "@/features/encryption/crypto/encryption";

function resetStore() {
  sessionStorage.clear();
  localStorage.clear();
  useAppLockStore.setState({
    pinHash: null,
    salt: null,
    autoLockMinutes: 0,
    rememberUntil: null,
    sessionUnlocked: false,
    lastActivityAt: Date.now(),
    encryptionEnabled: false,
    wrappedDek: null,
    kekSalt: null,
    kekIterations: null,
  });
  useEncryptionSessionStore.getState().clearDek();
}

describe("appLockStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("is disabled and unlocked by default", () => {
    const state = useAppLockStore.getState();
    expect(state.isEnabled()).toBe(false);
    expect(state.isLocked()).toBe(false);
  });

  it("becomes enabled and unlocked immediately after setting up a PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const state = useAppLockStore.getState();
    expect(state.isEnabled()).toBe(true);
    expect(state.isLocked()).toBe(false);
  });

  it("locking makes isLocked true", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    expect(useAppLockStore.getState().isLocked()).toBe(true);
  });

  it("unlock succeeds with the correct PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    const success = await useAppLockStore.getState().unlock("1234", false);

    expect(success).toBe(true);
    expect(useAppLockStore.getState().isLocked()).toBe(false);
  });

  it("unlock fails with the wrong PIN and stays locked", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    const success = await useAppLockStore.getState().unlock("0000", false);

    expect(success).toBe(false);
    expect(useAppLockStore.getState().isLocked()).toBe(true);
  });

  it("remembers the unlock across a simulated reload when remember is true", async () => {
    await useAppLockStore.getState().setupPin("1234", true);
    const rememberUntil = useAppLockStore.getState().rememberUntil;
    expect(rememberUntil).not.toBeNull();

    // Simulate a fresh page load: sessionUnlocked resets, but persisted
    // rememberUntil survives and should still count as unlocked.
    useAppLockStore.setState({ sessionUnlocked: false });
    expect(useAppLockStore.getState().isLocked()).toBe(false);
  });

  it("does not remember the unlock across a simulated reload when remember is false", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    expect(useAppLockStore.getState().rememberUntil).toBeNull();

    useAppLockStore.setState({ sessionUnlocked: false });
    expect(useAppLockStore.getState().isLocked()).toBe(true);
  });

  it("changePin requires the correct current PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const failed = await useAppLockStore.getState().changePin("0000", "5678");
    expect(failed).toBe(false);

    const succeeded = await useAppLockStore.getState().changePin("1234", "5678");
    expect(succeeded).toBe(true);

    useAppLockStore.getState().lock();
    expect(await useAppLockStore.getState().unlock("5678", false)).toBe(true);
  });

  it("disableLock requires the correct PIN and clears lock state", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const failed = await useAppLockStore.getState().disableLock("0000");
    expect(failed).toBe(false);
    expect(useAppLockStore.getState().isEnabled()).toBe(true);

    const succeeded = await useAppLockStore.getState().disableLock("1234");
    expect(succeeded).toBe(true);
    expect(useAppLockStore.getState().isEnabled()).toBe(false);
    expect(useAppLockStore.getState().isLocked()).toBe(false);
  });

  it("checkAutoLock locks after the configured inactivity window elapses", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().setAutoLockMinutes(5);
    useAppLockStore.setState({ lastActivityAt: Date.now() - 6 * 60 * 1000 });

    useAppLockStore.getState().checkAutoLock();

    expect(useAppLockStore.getState().isLocked()).toBe(true);
  });

  it("checkAutoLock does not lock before the inactivity window elapses", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().setAutoLockMinutes(5);
    useAppLockStore.setState({ lastActivityAt: Date.now() - 1 * 60 * 1000 });

    useAppLockStore.getState().checkAutoLock();

    expect(useAppLockStore.getState().isLocked()).toBe(false);
  });

  it("checkAutoLock is a no-op when auto-lock is disabled (0 minutes)", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.setState({ lastActivityAt: Date.now() - 60 * 60 * 1000 });

    useAppLockStore.getState().checkAutoLock();

    expect(useAppLockStore.getState().isLocked()).toBe(false);
  });

  describe("encryption wiring", () => {
    it("attachEncryption wraps the DEK, enables encryption, and populates the session store", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();

      await useAppLockStore.getState().attachEncryption("1234", dek);

      const state = useAppLockStore.getState();
      expect(state.encryptionEnabled).toBe(true);
      expect(state.wrappedDek).not.toBeNull();
      expect(state.kekSalt).not.toBeNull();
      expect(useEncryptionSessionStore.getState().dek).toBe(dek);
    });

    it("attachEncryption rejects the wrong PIN", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();

      await expect(useAppLockStore.getState().attachEncryption("0000", dek)).rejects.toThrow();
      expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    });

    it("unlock re-derives and restores the same DEK into the session store", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();
      await useAppLockStore.getState().attachEncryption("1234", dek);

      const envelope = await encryptField(dek, { title: "Coffee", amount: 120 });

      useAppLockStore.getState().lock();
      expect(useEncryptionSessionStore.getState().dek).toBeNull();

      const success = await useAppLockStore.getState().unlock("1234", false);
      expect(success).toBe(true);

      const restoredDek = useEncryptionSessionStore.getState().dek;
      expect(restoredDek).not.toBeNull();
      const decrypted = await decryptField<{ title: string; amount: number }>(restoredDek!, envelope);
      expect(decrypted).toEqual({ title: "Coffee", amount: 120 });
    });

    it("unlock throws EncryptionStateCorruptedError when the wrapped DEK is corrupted despite a correct PIN", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();
      await useAppLockStore.getState().attachEncryption("1234", dek);
      useAppLockStore.getState().lock();

      // Simulate corrupted/inconsistent local state (e.g. a botched write)
      // by swapping in a salt that doesn't match the one the DEK was
      // actually wrapped with — deriveKek then produces the wrong key,
      // and unwrapping fails exactly like real corruption would.
      useAppLockStore.setState({ kekSalt: "AAAAAAAAAAAAAAAAAAAAAA==" });

      await expect(useAppLockStore.getState().unlock("1234", false)).rejects.toThrow(
        EncryptionStateCorruptedError
      );
    });

    it("changePin re-wraps the existing DEK rather than generating a new one", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();
      await useAppLockStore.getState().attachEncryption("1234", dek);

      const envelope = await encryptField(dek, { title: "Salary", amount: 30000 });

      const changed = await useAppLockStore.getState().changePin("1234", "5678");
      expect(changed).toBe(true);

      useAppLockStore.getState().lock();
      const success = await useAppLockStore.getState().unlock("5678", false);
      expect(success).toBe(true);

      const restoredDek = useEncryptionSessionStore.getState().dek;
      const decrypted = await decryptField<{ title: string; amount: number }>(restoredDek!, envelope);
      expect(decrypted).toEqual({ title: "Salary", amount: 30000 });
    });

    it("changePin fails when encryption is enabled but the session DEK isn't resident", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();
      await useAppLockStore.getState().attachEncryption("1234", dek);

      useAppLockStore.getState().lock(); // clears the session DEK, stays locked

      const changed = await useAppLockStore.getState().changePin("1234", "5678");
      expect(changed).toBe(false);
    });

    it("disableLock refuses while encryption is enabled", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();
      await useAppLockStore.getState().attachEncryption("1234", dek);

      const result = await useAppLockStore.getState().disableLock("1234");

      expect(result).toBe(false);
      expect(useAppLockStore.getState().isEnabled()).toBe(true);
      expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    });

    it("completeRecovery sets a brand-new PIN and re-wraps the given DEK, with no old PIN required", async () => {
      const dek = await generateDek();
      const envelope = await encryptField(dek, { title: "Coffee", amount: 120 });

      await useAppLockStore.getState().completeRecovery("9999", dek);

      const state = useAppLockStore.getState();
      expect(state.encryptionEnabled).toBe(true);
      expect(state.isEnabled()).toBe(true);
      expect(state.isLocked()).toBe(false);
      expect(useEncryptionSessionStore.getState().dek).toBe(dek);

      useAppLockStore.getState().lock();
      const success = await useAppLockStore.getState().unlock("9999", false);
      expect(success).toBe(true);

      const restoredDek = useEncryptionSessionStore.getState().dek;
      const decrypted = await decryptField<{ title: string; amount: number }>(restoredDek!, envelope);
      expect(decrypted).toEqual({ title: "Coffee", amount: 120 });
    });

    it("completeRecovery replaces a stale existing PIN entirely (the old one stops working)", async () => {
      await useAppLockStore.getState().setupPin("1234", false);
      const dek = await generateDek();

      await useAppLockStore.getState().completeRecovery("4321", dek);

      useAppLockStore.getState().lock();
      expect(await useAppLockStore.getState().unlock("1234", false)).toBe(false);
      expect(await useAppLockStore.getState().unlock("4321", false)).toBe(true);
    });
  });
});
