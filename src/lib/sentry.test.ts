import { afterEach, expect, test, vi } from "vitest";
const sdk = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/react", () => sdk);
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.resetModules(); });

test("unconfigured monitoring remains a no-op", async () => {
  vi.stubEnv("VITE_SENTRY_DSN", "");
  const monitoring = await import("./sentry");
  monitoring.initErrorMonitoring();
  monitoring.captureError(new Error("local only"), {});
  await Promise.resolve();
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.captureException).not.toHaveBeenCalled();
});

test("buffers startup errors and captures boundary errors after one initialization", async () => {
  vi.stubEnv("VITE_SENTRY_DSN", "https://test@example.invalid/1");
  const monitoring = await import("./sentry");
  const early = new Error("early");
  const boundary = new Error("boundary");
  monitoring.initErrorMonitoring();
  window.dispatchEvent(new ErrorEvent("error", { error: early }));
  monitoring.captureError(boundary, { componentStack: "Fixture" });
  await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(2));
  expect(sdk.init).toHaveBeenCalledTimes(1);
  expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
  expect(sdk.captureException).toHaveBeenCalledWith(early);
  expect(sdk.captureException).toHaveBeenCalledWith(boundary, { extra: { componentStack: "Fixture" } });
});
