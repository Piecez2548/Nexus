import { useEffect, useState, type ReactNode } from "react";

import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { hasUndecryptableLocalData } from "@/features/encryption/catchUp";
import AppLockScreen from "@/features/lock/components/AppLockScreen";
import EncryptionRecoveryFlow from "@/features/encryption/components/EncryptionRecoveryFlow";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart"] as const;
const CHECK_INTERVAL_MS = 30_000;

interface Props {
  children: ReactNode;
}

export default function AppLockGate({ children }: Props) {
  const isEnabled = useAppLockStore((s) => s.isEnabled());
  const isLocked = useAppLockStore((s) => s.isLocked());
  const encryptionEnabled = useAppLockStore((s) => s.encryptionEnabled);
  const recordActivity = useAppLockStore((s) => s.recordActivity);
  const checkAutoLock = useAppLockStore((s) => s.checkAutoLock);
  const hasSessionDek = useEncryptionSessionStore((s) => s.dek !== null);
  const user = useAuthStore((s) => s.user);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);

  const [catchUpNeeded, setCatchUpNeeded] = useState(false);

  // Cross-device catch-up only applies to a device that has NEVER run the
  // enable/recovery flow itself (`encryptionEnabled` locally false) — one
  // that has (true) already has its own valid wrappedDek and must always go
  // through its normal PIN unlock first, never this account-password
  // recovery screen. Getting this wrong would force EVERY device through
  // account-password recovery on every fresh load (since hasSessionDek is
  // trivially false before any unlock, PIN-based or not), even the device
  // that originally enabled encryption and has a perfectly good local PIN.
  // Re-checked after every sync (lastSyncedAt) since that's when a *new*
  // device would actually receive encrypted rows for the first time.
  useEffect(() => {
    if (!user || hasSessionDek || encryptionEnabled) {
      setCatchUpNeeded(false);
      return;
    }

    let cancelled = false;
    hasUndecryptableLocalData().then((result) => {
      if (!cancelled) setCatchUpNeeded(result);
    });

    return () => {
      cancelled = true;
    };
  }, [user, hasSessionDek, encryptionEnabled, lastSyncedAt]);

  // Once encryption is enabled, "remember" can still skip PIN re-entry
  // within a tab that's already unlocked — but it can never skip it on a
  // fresh tab/session, since the DEK only ever lives in memory and can't be
  // recovered without the PIN. `isLocked()` alone (which "remember" can
  // satisfy from localStorage with no PIN entry at all) is not enough here.
  const needsUnlockScreen = (isEnabled && isLocked) || (encryptionEnabled && !hasSessionDek);

  useEffect(() => {
    if (!isEnabled || needsUnlockScreen || catchUpNeeded) return;

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity));
    const interval = setInterval(checkAutoLock, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [isEnabled, needsUnlockScreen, catchUpNeeded, recordActivity, checkAutoLock]);

  // Checked before the normal PIN/unlock screen — a fresh device can hit
  // this with no PIN set up at all yet, which the normal needsUnlockScreen
  // check would otherwise let straight through to the (unreadable) data.
  if (catchUpNeeded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <EncryptionRecoveryFlow
          onDone={() => setCatchUpNeeded(false)}
          title="พบข้อมูลที่เข้ารหัสจากอุปกรณ์อื่น"
          description="อุปกรณ์นี้ยังไม่สามารถอ่านข้อมูลที่เข้ารหัสไว้ได้ ยืนยันตัวตนด้วยบัญชี Sync เพื่อปลดล็อกข้อมูลบนอุปกรณ์นี้"
        />
      </div>
    );
  }

  if (needsUnlockScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <AppLockScreen mode="unlock" />
      </div>
    );
  }

  return <>{children}</>;
}
