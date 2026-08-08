// Feature Flags (PLT-008): local flags with developer/experimental gating and
// rollback. Pure resolution here; the persisted overrides live in the store.
// Experimental flags are off outside development unless explicitly overridden,
// so half-built features (e.g. full-gallery auto-scan) stay hidden in
// production but toggleable by a developer.

export interface FeatureFlagDef {
  id: string;
  default: boolean;
  experimental?: boolean;
  description?: string;
}

export const FEATURE_FLAGS: readonly FeatureFlagDef[] = [
  { id: "galleryScanner", default: true, description: "Scan Gallery button + import flow" },
  { id: "galleryAutoScan", default: false, experimental: true, description: "Full-gallery auto enumeration (native, WIP)" },
  { id: "commandPalette", default: true, description: "Ctrl+K command palette" },
  { id: "aiSlipVerification", default: false, experimental: true, description: "AI slip authenticity/fraud scoring in the UI" },
];

const FLAG_BY_ID = new Map(FEATURE_FLAGS.map((f) => [f.id, f]));

// Resolve a flag: an explicit override wins; otherwise experimental flags are
// off unless in a dev build, and everything else uses its default.
export function resolveFlag(id: string, override: boolean | undefined, isDev: boolean): boolean {
  if (override !== undefined) return override;
  const def = FLAG_BY_ID.get(id);
  if (!def) return false;
  // Experimental flags are visible to developers only: on in a dev build, off
  // in production (unless explicitly overridden above).
  if (def.experimental) return isDev;
  return def.default;
}

export function isDevBuild(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}
