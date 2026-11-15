// Which app this build is. The same source builds two apps:
//   - "hub" (default): Nexus, opening on the Project Hub at "/".
//   - "finance": Nexus Finance, opening straight on the finance Dashboard.
// Set at build time with VITE_APP_TARGET=finance (see scripts/build-android.ps1
// and docs/CONSOLIDATION_PLAN_2026-11-14.md). Only what really differs between
// the two apps reads this; everything else is shared.
export type AppTarget = "hub" | "finance";

export function resolveAppTarget(value: string | undefined): AppTarget {
  return value === "finance" ? "finance" : "hub";
}

export const APP_TARGET: AppTarget = resolveAppTarget(import.meta.env.VITE_APP_TARGET);
