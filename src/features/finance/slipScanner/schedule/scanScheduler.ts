// Smart scan scheduler policy (GS-023). Pure decision function: given a
// trigger, the schedule config, and the current device state, decide whether a
// scan should run now. It never rescans previously-scanned images — that is
// enforced downstream by the incremental scan cache (GS-008); the scheduler
// only governs *when* a scan is allowed to start. Battery/charging inputs are
// nullable (unknown on platforms that don't expose them) and never block a scan
// when unknown.

export type ScanTrigger = "manual" | "startup" | "scheduled";

export interface ScanScheduleConfig {
  enabled: boolean; // master switch for automatic (startup/scheduled) scans
  scanOnStartup: boolean;
  intervalMinutes: number; // minimum gap between scheduled scans
  minBatteryPercent: number; // below this, skip unless charging
  requireCharging: boolean; // only allow automatic scans while charging
}

export interface DeviceState {
  batteryPercent: number | null;
  charging: boolean | null;
}

export interface ScanDecision {
  shouldScan: boolean;
  reason: string;
}

export const DEFAULT_SCAN_SCHEDULE: ScanScheduleConfig = {
  enabled: true,
  scanOnStartup: false,
  intervalMinutes: 360, // 6h
  minBatteryPercent: 20,
  requireCharging: false,
};

export interface DecideScanParams {
  trigger: ScanTrigger;
  config: ScanScheduleConfig;
  device: DeviceState;
  lastScanAt: number | null; // epoch ms of the last completed scan
  now?: number;
}

export function decideScan(params: DecideScanParams): ScanDecision {
  const { trigger, config, device, lastScanAt, now = Date.now() } = params;

  // A manual scan is always honoured — the user asked for it explicitly, so
  // battery/charging/interval gates don't apply.
  if (trigger === "manual") return { shouldScan: true, reason: "manual" };

  if (!config.enabled) return { shouldScan: false, reason: "disabled" };
  if (trigger === "startup" && !config.scanOnStartup) return { shouldScan: false, reason: "startup-disabled" };

  if (trigger === "scheduled" && lastScanAt !== null) {
    const elapsedMin = (now - lastScanAt) / 60_000;
    if (elapsedMin < config.intervalMinutes) return { shouldScan: false, reason: "too-soon" };
  }

  if (config.requireCharging && device.charging === false) {
    return { shouldScan: false, reason: "not-charging" };
  }

  if (
    device.charging !== true &&
    device.batteryPercent !== null &&
    device.batteryPercent < config.minBatteryPercent
  ) {
    return { shouldScan: false, reason: "low-battery" };
  }

  return { shouldScan: true, reason: "ok" };
}
