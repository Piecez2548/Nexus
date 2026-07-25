import { useEffect, type ReactNode } from "react";

import { useAppLockStore } from "@/store/appLockStore";
import AppLockScreen from "@/features/lock/components/AppLockScreen";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart"] as const;
const CHECK_INTERVAL_MS = 30_000;

interface Props {
  children: ReactNode;
}

export default function AppLockGate({ children }: Props) {
  const isEnabled = useAppLockStore((s) => s.isEnabled());
  const isLocked = useAppLockStore((s) => s.isLocked());
  const recordActivity = useAppLockStore((s) => s.recordActivity);
  const checkAutoLock = useAppLockStore((s) => s.checkAutoLock);

  useEffect(() => {
    if (!isEnabled || isLocked) return;

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity));
    const interval = setInterval(checkAutoLock, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [isEnabled, isLocked, recordActivity, checkAutoLock]);

  if (isEnabled && isLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <AppLockScreen mode="unlock" />
      </div>
    );
  }

  return <>{children}</>;
}
