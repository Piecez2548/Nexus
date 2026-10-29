export const MANUAL_GALLERY_SCAN_MODE = { incremental: false, exhaustive: true } as const;
export const AUTOMATIC_GALLERY_SCAN_MODE = { incremental: true, exhaustive: false } as const;

// This must be explicitly enabled at build time (VITE_NEXUS_SCANNER_SAFE_MODE=true).
// It defaults off in normal builds and is enforced again at the transaction
// repository boundary in safeSmartImportDeps.ts.
export const scannerSafeVerificationMode = import.meta.env.VITE_NEXUS_SCANNER_SAFE_MODE === "true";
