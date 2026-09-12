import { useAppLockStore } from "../appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { LOCK_SIGNAL_KEY, readLockSignal, sessionIsCurrent } from "./lockSignal";

export function installLockSync(): () => void {
  let observed = readLockSignal()?.id;
  const sync = () => {
    const signal = readLockSignal();
    if (!signal || signal.id === observed) return;
    observed = signal.id;
    if (sessionIsCurrent()) return;
    // Rehydrate PIN/encryption metadata too; never copy another tab's unlocked state.
    void useAppLockStore.persist.rehydrate();
    try { sessionStorage.removeItem("nexus-session-unlocked"); } catch { /* In-memory lock remains. */ }
    useEncryptionSessionStore.getState().clearDek();
    useAppLockStore.setState({ sessionUnlocked: false, rememberUntil: null, hubLockRequired: signal.hub || useAppLockStore.getState().hubLockRequired });
  };
  const storage = (event: StorageEvent) => { if (event.key === LOCK_SIGNAL_KEY) sync(); };
  window.addEventListener("storage", storage);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", sync);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
}
