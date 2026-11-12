import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScanScheduleStore } from "@/features/finance/slipScanner/store/scanScheduleStore";
import { useLanguageStore } from "@/store/languageStore";

const isNative = vi.hoisted(() => ({ value: true }));
vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => isNative.value } };
});

import AutoSlipScanSettings from "./AutoSlipScanSettings";

beforeEach(() => {
  isNative.value = true;
  useScanScheduleStore.getState().reset();
  useLanguageStore.setState({ language: "en" });
});

describe("AutoSlipScanSettings", () => {
  it("renders nothing on web", () => {
    isNative.value = false;
    const { container } = render(<AutoSlipScanSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is off by default (opt-in) and toggles the scan-on-open config", async () => {
    const user = userEvent.setup();
    render(<AutoSlipScanSettings />);

    const toggle = screen.getByRole("switch", { name: "Auto-scan on open" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(useScanScheduleStore.getState().config.scanOnStartup).toBe(false);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(useScanScheduleStore.getState().config).toMatchObject({ enabled: true, scanOnStartup: true });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(useScanScheduleStore.getState().config.scanOnStartup).toBe(false);
  });
});
