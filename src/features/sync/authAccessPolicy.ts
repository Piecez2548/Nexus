import { Capacitor } from "@capacitor/core";

// Published browser builds fail closed if account configuration is missing.
// Local development, explicit E2E builds, and installed wrappers retain their
// existing local-only capability. No query string or referrer grants access.
export function allowsLocalOnlyAccess() {
  return import.meta.env.DEV || import.meta.env.MODE === "e2e"
    || Capacitor.isNativePlatform() || window.location.protocol === "file:";
}
