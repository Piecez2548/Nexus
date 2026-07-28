import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsNativePlatform = vi.fn();
const mockIsAvailable = vi.fn();
const mockSetCredentials = vi.fn();
const mockGetSecureCredentials = vi.fn();
const mockDeleteCredentials = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capgo/capacitor-native-biometric", () => ({
  NativeBiometric: {
    isAvailable: (...args: unknown[]) => mockIsAvailable(...args),
    setCredentials: (...args: unknown[]) => mockSetCredentials(...args),
    getSecureCredentials: (...args: unknown[]) => mockGetSecureCredentials(...args),
    deleteCredentials: (...args: unknown[]) => mockDeleteCredentials(...args),
  },
  AccessControl: { NONE: 0, BIOMETRY_CURRENT_SET: 1, BIOMETRY_ANY: 2 },
}));

vi.mock("@/i18n/useTranslation", () => ({
  translate: (key: string) => key,
}));

const { isBiometricAvailable, storeBiometricCredential, retrieveBiometricPin, deleteBiometricCredential } =
  await import("./biometricService");

describe("biometricService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isBiometricAvailable", () => {
    it("returns false when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      expect(await isBiometricAvailable()).toBe(false);
      expect(mockIsAvailable).not.toHaveBeenCalled();
    });

    it("returns true when the native check reports available hardware", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockIsAvailable.mockResolvedValue({ isAvailable: true });
      expect(await isBiometricAvailable()).toBe(true);
      expect(mockIsAvailable).toHaveBeenCalledWith();
    });

    it("returns false when the native check reports unavailable", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockIsAvailable.mockResolvedValue({ isAvailable: false });
      expect(await isBiometricAvailable()).toBe(false);
    });

    it("returns false when the native check throws", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockIsAvailable.mockRejectedValue(new Error("boom"));
      expect(await isBiometricAvailable()).toBe(false);
    });
  });

  describe("storeBiometricCredential", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await storeBiometricCredential("1234");
      expect(mockSetCredentials).not.toHaveBeenCalled();
    });

    it("stores the PIN under BIOMETRY_ANY access control", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await storeBiometricCredential("1234");
      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "1234",
          server: "com.nexus.app",
          accessControl: 2,
        })
      );
    });
  });

  describe("retrieveBiometricPin", () => {
    it("returns null when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      expect(await retrieveBiometricPin()).toBeNull();
      expect(mockGetSecureCredentials).not.toHaveBeenCalled();
    });

    it("returns the decrypted PIN on success", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockGetSecureCredentials.mockResolvedValue({ username: "nexus-app-lock-pin", password: "1234" });
      expect(await retrieveBiometricPin()).toBe("1234");
      expect(mockGetSecureCredentials).toHaveBeenCalledWith(expect.objectContaining({ server: "com.nexus.app" }));
    });

    it("returns null when the prompt is cancelled or fails", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockGetSecureCredentials.mockRejectedValue(new Error("cancelled"));
      expect(await retrieveBiometricPin()).toBeNull();
    });
  });

  describe("deleteBiometricCredential", () => {
    it("does nothing when not running on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      await deleteBiometricCredential();
      expect(mockDeleteCredentials).not.toHaveBeenCalled();
    });

    it("deletes the stored credential when native", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockDeleteCredentials.mockResolvedValue(undefined);
      await deleteBiometricCredential();
      expect(mockDeleteCredentials).toHaveBeenCalledWith({ server: "com.nexus.app" });
    });

    it("swallows errors when there is nothing to delete", async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockDeleteCredentials.mockRejectedValue(new Error("not found"));
      await expect(deleteBiometricCredential()).resolves.toBeUndefined();
    });
  });
});
