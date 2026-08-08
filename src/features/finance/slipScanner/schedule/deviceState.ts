import type { DeviceState } from "@/features/finance/slipScanner/schedule/scanScheduler";

interface BatteryLike {
  level: number; // 0..1
  charging: boolean;
}

// Best-effort current device battery/charging state for the scheduler. Uses the
// web Battery Status API where available; returns nulls when unknown (older
// browsers, or the WebView on a device that doesn't expose it) so the scheduler
// simply doesn't gate on battery. On-device native battery would come from a
// Capacitor device plugin later — not required for the policy to work.
export async function getDeviceState(): Promise<DeviceState> {
  try {
    const nav = navigator as unknown as { getBattery?: () => Promise<BatteryLike> };
    if (typeof nav.getBattery === "function") {
      const battery = await nav.getBattery();
      return { batteryPercent: Math.round(battery.level * 100), charging: battery.charging };
    }
  } catch {
    // Ignore — fall through to unknown.
  }
  return { batteryPercent: null, charging: null };
}
