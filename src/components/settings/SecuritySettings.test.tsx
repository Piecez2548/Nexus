import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockIsBiometricAvailable = vi.fn();
const mockStoreBiometricCredential = vi.fn();
const mockDeleteBiometricCredential = vi.fn();

vi.mock("@/features/lock/services/biometricService", () => ({
  isBiometricAvailable: (...args: unknown[]) => mockIsBiometricAvailable(...args),
  storeBiometricCredential: (...args: unknown[]) => mockStoreBiometricCredential(...args),
  deleteBiometricCredential: (...args: unknown[]) => mockDeleteBiometricCredential(...args),
  retrieveBiometricPin: () => Promise.resolve(null),
}));

const { default: SecuritySettings } = await import("./SecuritySettings");
const { useAppLockStore } = await import("@/store/appLockStore");

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
    biometricEnabled: false,
  });
}

describe("SecuritySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsBiometricAvailable.mockResolvedValue(false);
    mockStoreBiometricCredential.mockResolvedValue(undefined);
    mockDeleteBiometricCredential.mockResolvedValue(undefined);
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

  describe("biometric unlock", () => {
    it("hides the biometric controls entirely when unavailable", async () => {
      mockIsBiometricAvailable.mockResolvedValue(false);
      await useAppLockStore.getState().setupPin("1234", false);

      render(<SecuritySettings />);

      await waitFor(() => expect(mockIsBiometricAvailable).toHaveBeenCalled());
      expect(screen.queryByRole("button", { name: "Enable Fingerprint Unlock" })).not.toBeInTheDocument();
    });

    it("shows an Enable Fingerprint Unlock button when available and not yet enabled", async () => {
      mockIsBiometricAvailable.mockResolvedValue(true);
      await useAppLockStore.getState().setupPin("1234", false);

      render(<SecuritySettings />);

      expect(await screen.findByRole("button", { name: "Enable Fingerprint Unlock" })).toBeInTheDocument();
    });

    it("enables biometric unlock with the correct PIN", async () => {
      mockIsBiometricAvailable.mockResolvedValue(true);
      await useAppLockStore.getState().setupPin("1234", false);

      const user = userEvent.setup();
      render(<SecuritySettings />);

      await user.click(await screen.findByRole("button", { name: "Enable Fingerprint Unlock" }));
      await user.type(await screen.findByLabelText("Confirm PIN"), "1234");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(useAppLockStore.getState().biometricEnabled).toBe(true);
      });
      expect(mockStoreBiometricCredential).toHaveBeenCalledWith("1234");
    });

    it("shows an error and does not enable biometric unlock with the wrong PIN", async () => {
      mockIsBiometricAvailable.mockResolvedValue(true);
      await useAppLockStore.getState().setupPin("1234", false);

      const user = userEvent.setup();
      render(<SecuritySettings />);

      await user.click(await screen.findByRole("button", { name: "Enable Fingerprint Unlock" }));
      await user.type(await screen.findByLabelText("Confirm PIN"), "0000");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("Incorrect PIN")).toBeInTheDocument();
      expect(useAppLockStore.getState().biometricEnabled).toBe(false);
    });

    it("shows the enabled status and disables biometric unlock on request", async () => {
      mockIsBiometricAvailable.mockResolvedValue(true);
      await useAppLockStore.getState().setupPin("1234", false);
      await useAppLockStore.getState().enableBiometric("1234");

      const user = userEvent.setup();
      render(<SecuritySettings />);

      expect(await screen.findByText("Fingerprint unlock is enabled")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Disable Fingerprint Unlock" }));

      await waitFor(() => {
        expect(useAppLockStore.getState().biometricEnabled).toBe(false);
      });
      expect(mockDeleteBiometricCredential).toHaveBeenCalled();
    });
  });
});
