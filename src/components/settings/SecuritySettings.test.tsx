import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SecuritySettings from "./SecuritySettings";
import { useAppLockStore } from "@/store/appLockStore";

function resetStore() {
  sessionStorage.clear();
  localStorage.clear();
  useAppLockStore.setState({
    pinHash: null,
    salt: null,
    autoLockMinutes: 0,
    rememberUntil: null,
    sessionUnlocked: false,
    lastActivityAt: Date.now(),
  });
}

describe("SecuritySettings", () => {
  beforeEach(() => {
    resetStore();
  });

  it("shows an Enable App Lock button when no PIN is set", () => {
    render(<SecuritySettings />);
    expect(screen.getByRole("button", { name: "Enable App Lock" })).toBeInTheDocument();
  });

  it("sets up a PIN and shows the enabled state afterwards", async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await user.click(screen.getByRole("button", { name: "Enable App Lock" }));
    await user.type(await screen.findByLabelText("PIN"), "1234");
    await user.type(screen.getByLabelText("ยืนยัน PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "ตั้งค่า PIN" }));

    expect(await screen.findByText("App Lock is enabled")).toBeInTheDocument();
    expect(useAppLockStore.getState().isEnabled()).toBe(true);
  });

  it("changes the PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const user = userEvent.setup();
    render(<SecuritySettings />);

    await user.click(await screen.findByRole("button", { name: "Change PIN" }));
    await user.type(await screen.findByLabelText("PIN ปัจจุบัน"), "1234");
    await user.type(screen.getByLabelText("PIN ใหม่"), "5678");
    await user.type(screen.getByLabelText("ยืนยัน PIN ใหม่"), "5678");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(async () => {
      expect(await useAppLockStore.getState().unlock("5678", false)).toBe(true);
    });
  });

  it("disables App Lock with the correct PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const user = userEvent.setup();
    render(<SecuritySettings />);

    await user.click(await screen.findByRole("button", { name: "Disable" }));
    await user.type(await screen.findByLabelText("กรอก PIN เพื่อยืนยัน"), "1234");
    await user.click(screen.getByRole("button", { name: "ปิดการใช้งาน App Lock" }));

    await waitFor(() => {
      expect(useAppLockStore.getState().isEnabled()).toBe(false);
    });
  });

  it("locks immediately when Lock Now is clicked", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const user = userEvent.setup();
    render(<SecuritySettings />);

    await user.click(await screen.findByRole("button", { name: "Lock Now" }));

    expect(useAppLockStore.getState().isLocked()).toBe(true);
  });

  it("updates the auto-lock timeout", async () => {
    await useAppLockStore.getState().setupPin("1234", false);

    const user = userEvent.setup();
    render(<SecuritySettings />);

    await user.selectOptions(
      await screen.findByLabelText("Auto-lock when inactive"),
      "15"
    );

    expect(useAppLockStore.getState().autoLockMinutes).toBe(15);
  });
});
