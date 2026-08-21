import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockEnrollTotp = vi.fn();
const mockCompleteTotpEnrollment = vi.fn();
const mockGenerateBackupCodes = vi.fn();

vi.mock("@/features/sync/mfa", () => ({
  enrollTotp: (...args: unknown[]) => mockEnrollTotp(...args),
  completeTotpEnrollment: (...args: unknown[]) => mockCompleteTotpEnrollment(...args),
}));

vi.mock("@/features/sync/backupCodes", () => ({
  generateBackupCodes: (...args: unknown[]) => mockGenerateBackupCodes(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: EnrollMfaForm } = await import("./EnrollMfaForm");

describe("EnrollMfaForm", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u1", email: "a@b.com" } as never });
    mockEnrollTotp.mockReset();
    mockCompleteTotpEnrollment.mockReset();
    mockGenerateBackupCodes.mockReset();
  });

  it("starts enrollment on mount and shows the QR + secret once ready", async () => {
    mockEnrollTotp.mockResolvedValue({ factorId: "factor-1", qrCodeDataUri: "data:image/svg+xml;utf-8,<svg/>", secret: "SECRET123" });

    render(<EnrollMfaForm onDone={() => {}} />);

    expect(await screen.findByText("Set Up Two-Factor Authentication")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SECRET123")).toBeInTheDocument();
  });

  it("shows an error state when enrollment itself fails to start", async () => {
    mockEnrollTotp.mockRejectedValue(new Error("network error"));
    render(<EnrollMfaForm onDone={() => {}} />);
    expect(await screen.findByText("Could not start two-factor setup. Try again.")).toBeInTheDocument();
  });

  it("confirms the code, generates backup codes, and shows them", async () => {
    mockEnrollTotp.mockResolvedValue({ factorId: "factor-1", qrCodeDataUri: "data:image/svg+xml;utf-8,<svg/>", secret: "SECRET123" });
    mockCompleteTotpEnrollment.mockResolvedValue(undefined);
    mockGenerateBackupCodes.mockResolvedValue(["AAAAA-11111", "BBBBB-22222"]);

    const user = userEvent.setup();
    render(<EnrollMfaForm onDone={() => {}} />);

    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(mockCompleteTotpEnrollment).toHaveBeenCalledWith("factor-1", "123456");
    expect(mockGenerateBackupCodes).toHaveBeenCalledWith("u1");
    expect(await screen.findByText("Save your backup codes")).toBeInTheDocument();
    expect(screen.getByText("AAAAA-11111")).toBeInTheDocument();
    expect(screen.getByText("BBBBB-22222")).toBeInTheDocument();
  });

  it("shows an error and stays on the confirm step when the code is wrong", async () => {
    mockEnrollTotp.mockResolvedValue({ factorId: "factor-1", qrCodeDataUri: "data:image/svg+xml;utf-8,<svg/>", secret: "SECRET123" });
    mockCompleteTotpEnrollment.mockRejectedValue(new Error("Invalid code"));

    const user = userEvent.setup();
    render(<EnrollMfaForm onDone={() => {}} />);

    await user.type(await screen.findByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("Invalid code")).toBeInTheDocument();
    expect(mockGenerateBackupCodes).not.toHaveBeenCalled();
  });

  it("calls onDone after acknowledging the backup codes", async () => {
    mockEnrollTotp.mockResolvedValue({ factorId: "factor-1", qrCodeDataUri: "data:image/svg+xml;utf-8,<svg/>", secret: "SECRET123" });
    mockCompleteTotpEnrollment.mockResolvedValue(undefined);
    mockGenerateBackupCodes.mockResolvedValue(["AAAAA-11111"]);

    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EnrollMfaForm onDone={onDone} />);

    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    await user.click(await screen.findByRole("button", { name: "I've saved these codes" }));
    expect(onDone).toHaveBeenCalled();
  });
});
