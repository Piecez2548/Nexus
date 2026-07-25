import { RouterProvider } from "react-router-dom";

import { router } from "@/router/router";
import AppLockGate from "@/features/lock/components/AppLockGate";
import { SyncProvider } from "@/features/sync/components/SyncProvider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppLockGate>
        <SyncProvider />
        <RouterProvider router={router} />
      </AppLockGate>
    </ErrorBoundary>
  );
}
