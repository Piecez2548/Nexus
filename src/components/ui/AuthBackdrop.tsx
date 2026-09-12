import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// Shared full-screen backdrop for the app's gate states (sign-in, PIN
// unlock, cross-device encryption recovery) so they read as one consistent,
// polished "arriving at Nexus" moment instead of a flat gray page.
export default function AuthBackdrop({ children }: Props) {
  return (
    <div className="nexus-auth-backdrop relative flex min-h-screen items-center justify-center px-4 py-8">
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
