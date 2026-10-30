import type { ThemeMode } from "@/store/appSettingsStore";

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return prefersDark();
}

// Browser chrome colour; the pre-paint script in index.html mirrors these values.
export function themeColorFor(mode: ThemeMode): string {
  if (mode === "mono") return "#fafafa";
  return resolveIsDark(mode) ? "#0c0b10" : "#f5f7f4";
}
