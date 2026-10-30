import { configureAuditLog } from "@/features/security/auditLog";
import { dexieAuditSink } from "@/features/security/dexieAuditSink";
import { installToolsSessionLinks } from "@/features/sync/toolsSession";
import { installLockSync } from "@/store/appLock/installLockSync";

// Account-side startup that used to run in main.tsx. It lives here so public
// pages (All, AlgoViz, ScreenTutor) stay off the Dexie/lock/Supabase stack;
// AuthGate and the signed-in hub call it before any account UI renders.
let cleanup: (() => void) | null = null;

export function installAccountBoot(): void {
  if (cleanup) return;
  // Every recordAudit() from here on survives a reload.
  configureAuditLog({ sink: dexieAuditSink });
  const removeToolsSessionLinks = installToolsSessionLinks();
  const removeLockSync = installLockSync();
  cleanup = () => {
    removeToolsSessionLinks();
    removeLockSync();
    configureAuditLog({ sink: null });
    cleanup = null;
  };
}

if (import.meta.hot) import.meta.hot.dispose(() => cleanup?.());
