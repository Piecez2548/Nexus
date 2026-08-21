import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockVerifyTotpCode = vi.fn();
const mockGenerateBackupCodes = vi.fn();

vi.mock("@/features/sync/mfa", () => ({
  verifyTotpCode: (...args: unknown[]) => mockVerifyTotpCode(...args),
}));

vi.mock("@/features/sync/backupCodes", () => ({
  generateBackupCodes: (...args: unknown[]) => mockGenerateBackupCodes(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: RegenerateBackupCodesForm } = await import("./RegenerateBackupCodesForm");

describe("RegenerateBackupCodesForm", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u1", email: "a@b.com" } as never });
    mockVerifyTotpCode.mockReset();
    mockGenerateBackupCodes.mockReset();
  });

  it("verifies the code, regenerates codes, and shows them", async () => {
    mockVerifyTotpCode.mockResolvedValue(undefined);
    mockGenerateBackupCodes.mockResolvedValue(["CCCCC-33333"]);

    const user = userEvent.setup();
    render(<RegenerateBackupCodesForm factorId="factor-1" onDone={() => {}} />);

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(mockVerifyTotpCode).toHaveBeenCalledWith("factor-1", "123456");
    expect(mockGenerateBackupCodes).toHaveBeenCalledWith("u1");
    expect(await screen.findByText("CCCCC-33333")).toBeInTheDocument();
  });

  it("shows an error and does not regenerate when the code is wrong", async () => {
    mockVerifyTotpCode.mockRejectedValue(new Error("Invalid code"));

    const user = userEvent.setup();
    render(<RegenerateBackupCodesForm factorId="factor-1" onDone={() => {}} />);

    await user.type(screen.getByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(await screen.findByText("Invalid code")).toBeInTheDocument();
    expect(mockGenerateBackupCodes).not.toHaveBeenCalled();
  });
});
