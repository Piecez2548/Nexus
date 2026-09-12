const dsn = import.meta.env.VITE_SENTRY_DSN;

// Error monitoring is entirely optional — without this env var set (e.g.
// CI, the login-free preview build used for manual QA, or a dev machine
// that hasn't configured it), the app keeps working exactly as before,
// just without automatic crash reporting.
export const isErrorMonitoringConfigured = Boolean(dsn);

let startup: Promise<typeof import("./sentryClient") | null> | undefined;
const pending: unknown[] = [];
let buffering = false;
const onError = (event: ErrorEvent) => { if (pending.length < 50) pending.push(event.error ?? event.message); };
const onRejection = (event: PromiseRejectionEvent) => { if (pending.length < 50) pending.push(event.reason); };

function startBuffering() {
  if (buffering || !isErrorMonitoringConfigured) return;
  buffering = true;
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
}

function stopBuffering() {
  if (!buffering) return;
  buffering = false;
  window.removeEventListener("error", onError);
  window.removeEventListener("unhandledrejection", onRejection);
}

function loadMonitoring() {
  if (!isErrorMonitoringConfigured) return Promise.resolve(null);
  if (startup) return startup;
  startBuffering();
  startup = import("./sentryClient").then(Sentry => {
    stopBuffering();
    Sentry.init({ dsn, environment: import.meta.env.MODE, sendDefaultPii: false });
    for (const error of pending.splice(0)) Sentry.captureException(error);
    return Sentry;
  }).catch(() => { stopBuffering(); return null; });
  return startup;
}

export function initErrorMonitoring() {
  if (!isErrorMonitoringConfigured) return;
  // Preserve startup errors immediately, but keep the optional monitoring SDK
  // off the critical login waterfall on constrained first visits.
  startBuffering();
  const schedule = () => window.setTimeout(() => { void loadMonitoring(); }, 4_000);
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

export function captureError(error: unknown, extra: Record<string, unknown>) {
  void loadMonitoring().then(Sentry => { Sentry?.captureException(error, { extra }); });
}
