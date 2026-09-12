// A lock generation invalidates older tab sessions without transferring a PIN or DEK.
export const LOCK_SIGNAL_KEY = "nexus-lock-signal";
const SESSION_GENERATION_KEY = "nexus-unlock-generation";
export interface LockSignal { id: string; hub: boolean }
export function readLockSignal(): LockSignal | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LOCK_SIGNAL_KEY) ?? "null");
    if (value && typeof value === "object" && "id" in value && typeof value.id === "string" && "hub" in value && typeof value.hub === "boolean") return value as LockSignal;
  } catch { /* Storage unavailable: retain this tab's local PIN gate. */ }
  return null;
}
export function publishLock(hub: boolean): void {
  try { localStorage.setItem(LOCK_SIGNAL_KEY, JSON.stringify({ id: crypto.randomUUID(), hub })); }
  catch { /* Current-tab locking still works when storage is unavailable. */ }
}
export function acknowledgeLock(): void {
  try { sessionStorage.setItem(SESSION_GENERATION_KEY, readLockSignal()?.id ?? ""); } catch { /* No remembered session. */ }
}
export function sessionIsCurrent(): boolean {
  const signal = readLockSignal();
  if (!signal) return true; // Compatible with existing sessions before the first lock.
  try { return sessionStorage.getItem(SESSION_GENERATION_KEY) === signal.id; } catch { return false; }
}
