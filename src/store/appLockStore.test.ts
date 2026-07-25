import { describe, expect, it, beforeEach } from "vitest";
import { useAppLockStore } from "./appLockStore";

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
  });
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
});
