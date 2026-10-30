import { lazy, Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isHubPath, mainReturnPath } from "@/features/sync/hubEntry";

// Loaded only for sign-in and Main, so the public hub skips the account stack.
const AuthGate = lazy(() => import("@/features/sync/components/AuthGate"));

export default function AccountRouteGate() {
  const location = useLocation();
  const hub = isHubPath(location.pathname);
  const returnParam = hub ? new URLSearchParams(location.search).get("returnTo") : null;
  // All is public; it becomes the sign-in screen only when Main sent the visitor here.
  if (hub && returnParam === null) return <Outlet />;
  const returnTo = hub ? mainReturnPath(returnParam) : null;
  const loginPath = `/projects?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  return (
    <Suspense fallback={null}>
      <AuthGate loginFallback={hub ? undefined : <Navigate to={loginPath} replace />}>
        {returnTo ? <Navigate to={returnTo} replace /> : <Outlet />}
      </AuthGate>
    </Suspense>
  );
}
