import { useEffect, type ReactNode } from "react";

import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import AppLockScreen from "@/features/lock/components/AppLockScreen";

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

  // Once encryption is enabled, "remember" can still skip PIN re-entry
  // within a tab that's already unlocked — but it can never skip it on a
  // fresh tab/session, since the DEK only ever lives in memory and can't be
  // recovered without the PIN. `isLocked()` alone (which "remember" can
  // satisfy from localStorage with no PIN entry at all) is not enough here.
  const needsUnlockScreen = (isEnabled && isLocked) || (encryptionEnabled && !hasSessionDek);

  useEffect(() => {
    if (!isEnabled || needsUnlockScreen) return;

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity));
    const interval = setInterval(checkAutoLock, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [isEnabled, needsUnlockScreen, recordActivity, checkAutoLock]);

  if (needsUnlockScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <AppLockScreen mode="unlock" />
      </div>
    );
  }

  return <>{children}</>;
}
