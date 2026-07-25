import { useEffect, useState } from "react";
import type { ThemeMode } from "@/store/appSettingsStore";
import { resolveIsDark } from "@/utils/theme";

// Tracks whether dark styling is actually in effect for the given theme
// mode, resolving "system" against the OS preference and staying in sync
// if that preference changes while mounted.
export function useResolvedTheme(mode: ThemeMode): boolean {
  const [isDark, setIsDark] = useState(() => resolveIsDark(mode));

  useEffect(() => {
    setIsDark(resolveIsDark(mode));

    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setIsDark(resolveIsDark(mode));
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode]);

  return isDark;
}
