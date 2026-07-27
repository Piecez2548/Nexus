import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Error monitoring is entirely optional — without this env var set (e.g.
// CI, the login-free preview build used for manual QA, or a dev machine
// that hasn't configured it), the app keeps working exactly as before,
// just without automatic crash reporting.
export const isErrorMonitoringConfigured = Boolean(dsn);

export function initErrorMonitoring() {
  if (!isErrorMonitoringConfigured) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Local-first app — no user data should leave the device beyond what's
    // already opted into via Sync. Sentry's automatic breadcrumbs (console
    // logs, fetch/XHR, DOM clicks) can capture request URLs, so this stays
    // off (the default) rather than opting into IP/header/cookie capture.
    sendDefaultPii: false,
  });
}
