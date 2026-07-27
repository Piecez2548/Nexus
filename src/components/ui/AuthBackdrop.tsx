import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// Shared full-screen backdrop for the app's gate states (sign-in, PIN
// unlock, cross-device encryption recovery) so they read as one consistent,
// polished "arriving at Nexus" moment instead of a flat gray page.
export default function AuthBackdrop({ children }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl dark:bg-brand-500/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-glow/20 blur-3xl dark:bg-brand-glow/10" />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
