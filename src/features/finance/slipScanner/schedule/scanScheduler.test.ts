import { describe, expect, it } from "vitest";

import { DEFAULT_SCAN_SCHEDULE, decideScan, type ScanScheduleConfig } from "./scanScheduler";

const config = (over: Partial<ScanScheduleConfig> = {}): ScanScheduleConfig => ({ ...DEFAULT_SCAN_SCHEDULE, ...over });
const charged = { batteryPercent: 80, charging: false };

describe("decideScan", () => {
  it("always runs a manual scan, ignoring every gate", () => {
    const decision = decideScan({
      trigger: "manual",
      config: config({ enabled: false, requireCharging: true }),
      device: { batteryPercent: 5, charging: false },
      lastScanAt: Date.now(),
    });
    expect(decision).toEqual({ shouldScan: true, reason: "manual" });
  });

  it("skips automatic scans when disabled", () => {
    expect(decideScan({ trigger: "scheduled", config: config({ enabled: false }), device: charged, lastScanAt: null }).reason).toBe("disabled");
  });

  it("respects the startup toggle", () => {
    expect(decideScan({ trigger: "startup", config: config({ scanOnStartup: false }), device: charged, lastScanAt: null }).reason).toBe("startup-disabled");
    expect(decideScan({ trigger: "startup", config: config({ scanOnStartup: true }), device: charged, lastScanAt: null }).shouldScan).toBe(true);
  });

  it("gates resume on the same switch as startup and throttles rapid resumes", () => {
    const now = 10_000_000;
    expect(decideScan({ trigger: "resume", config: config({ scanOnStartup: false }), device: charged, lastScanAt: null, now }).reason).toBe("startup-disabled");
    const on = config({ scanOnStartup: true });
    expect(decideScan({ trigger: "resume", config: on, device: charged, lastScanAt: null, now }).shouldScan).toBe(true);
    expect(decideScan({ trigger: "resume", config: on, device: charged, lastScanAt: now - 60_000, now }).reason).toBe("too-soon");
    expect(decideScan({ trigger: "resume", config: on, device: charged, lastScanAt: now - 6 * 60_000, now }).shouldScan).toBe(true);
    // The 6h scheduled interval must not apply to resume.
    expect(decideScan({ trigger: "resume", config: { ...on, intervalMinutes: 360 }, device: charged, lastScanAt: now - 10 * 60_000, now }).shouldScan).toBe(true);
  });

  it("keeps automatic scanning opt-in: the default config never starts a startup or resume scan", () => {
    for (const trigger of ["startup", "resume"] as const) {
      expect(decideScan({ trigger, config: DEFAULT_SCAN_SCHEDULE, device: charged, lastScanAt: null }).reason).toBe("startup-disabled");
    }
  });

  it("enforces the scheduled interval", () => {
    const now = 10_000_000;
    const config1 = config({ intervalMinutes: 60 });
    expect(decideScan({ trigger: "scheduled", config: config1, device: charged, lastScanAt: now - 30 * 60_000, now }).reason).toBe("too-soon");
    expect(decideScan({ trigger: "scheduled", config: config1, device: charged, lastScanAt: now - 90 * 60_000, now }).shouldScan).toBe(true);
  });

  it("skips on low battery unless charging", () => {
    expect(decideScan({ trigger: "scheduled", config: config({ minBatteryPercent: 20 }), device: { batteryPercent: 10, charging: false }, lastScanAt: null }).reason).toBe("low-battery");
    expect(decideScan({ trigger: "scheduled", config: config({ minBatteryPercent: 20 }), device: { batteryPercent: 10, charging: true }, lastScanAt: null }).shouldScan).toBe(true);
  });

  it("requires charging when configured", () => {
    expect(decideScan({ trigger: "scheduled", config: config({ requireCharging: true }), device: { batteryPercent: 90, charging: false }, lastScanAt: null }).reason).toBe("not-charging");
  });

  it("does not gate on battery when it is unknown", () => {
    expect(decideScan({ trigger: "scheduled", config: config(), device: { batteryPercent: null, charging: null }, lastScanAt: null }).shouldScan).toBe(true);
  });
});
