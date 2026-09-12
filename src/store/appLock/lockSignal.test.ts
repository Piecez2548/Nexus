import { beforeEach, expect, test, vi } from "vitest";
import { useAppLockStore } from "../appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import { installLockSync } from "./installLockSync";
import { LOCK_SIGNAL_KEY, publishLock, sessionIsCurrent } from "./lockSignal";

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  useAppLockStore.setState({ pinHash: null, salt: null, encryptionEnabled: false, sessionUnlocked: false, rememberUntil: null, hubLockRequired: false, unlockGeneration: null });
});
test("remote lock invalidates Remember, clears DEK and requires a fresh PIN", async () => {
  await useAppLockStore.getState().setupPin("1234", true);
  const clear = vi.spyOn(useEncryptionSessionStore.getState(), "clearDek");
  const dispose = installLockSync();
  try {
    publishLock(true);
    window.dispatchEvent(new StorageEvent("storage", { key: LOCK_SIGNAL_KEY }));
    expect(clear).toHaveBeenCalled();
    expect(useAppLockStore.getState().isLocked()).toBe(true);
    expect(useAppLockStore.getState().hubLockRequired).toBe(true);
    expect(sessionIsCurrent()).toBe(false);
    expect(await useAppLockStore.getState().unlock("0000", false)).toBe(false);
    expect(await useAppLockStore.getState().unlock("1234", false)).toBe(true);
    window.dispatchEvent(new Event("focus"));
    expect(useAppLockStore.getState().isLocked()).toBe(false);
    publishLock(true);
    // Focus fallback covers a missed storage event in a suspended tab.
    window.dispatchEvent(new Event("focus"));
    expect(useAppLockStore.getState().isLocked()).toBe(true);
  } finally { dispose(); clear.mockRestore(); }
});
test("rehydration rejects stale persisted Remember and tab unlock after a lock", async () => {
  await useAppLockStore.getState().setupPin("1234", true);
  publishLock(true);
  await useAppLockStore.persist.rehydrate();
  expect(useAppLockStore.getState().isLocked()).toBe(true);
  expect(useAppLockStore.getState().rememberUntil).toBeNull();
  expect(useAppLockStore.getState().hubLockRequired).toBe(true);
});

test("a correct PIN wins over a lock generation published during slow key unwrapping", async () => {
  await useAppLockStore.getState().setupPin("1234", false);
  await useAppLockStore.getState().attachEncryption("1234", await generateDek());
  useAppLockStore.getState().lock();

  const deriveKey = crypto.subtle.deriveKey.bind(crypto.subtle);
  const deriveSpy = vi.spyOn(crypto.subtle, "deriveKey").mockImplementation(async (...args) => {
    // Reproduce another All/Main tab reloading and broadcasting a lock while
    // this tab is between PIN verification and the final unlock commit.
    publishLock(true);
    return deriveKey(...args);
  });

  try {
    expect(await useAppLockStore.getState().unlock("1234", false)).toBe(true);
    expect(sessionIsCurrent()).toBe(true);
    expect(useAppLockStore.getState().isLocked()).toBe(false);
  } finally {
    deriveSpy.mockRestore();
  }
});
