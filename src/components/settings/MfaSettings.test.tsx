import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockGetVerifiedTotpFactor = vi.fn();
const mockCountRemainingBackupCodes = vi.fn();
const mockUnenrollTotp = vi.fn();

vi.mock("@/features/sync/mfa", () => ({
  getVerifiedTotpFactor: (...args: unknown[]) => mockGetVerifiedTotpFactor(...args),
  unenrollTotp: (...args: unknown[]) => mockUnenrollTotp(...args),
}));

vi.mock("@/features/sync/backupCodes", () => ({
  countRemainingBackupCodes: (...args: unknown[]) => mockCountRemainingBackupCodes(...args),
}));

// EnrollMfaForm/RegenerateBackupCodesForm pull in the real supabase client
// module chain (mfa.ts, backupCodes.ts) -- stub them out here since this
// test only cares about MfaSettings' own enabled/disabled card state, not
// the enrollment wizard itself (covered by EnrollMfaForm's own tests, once
// added).
vi.mock("@/features/sync/components/EnrollMfaForm", () => ({
  default: () => <div>Enroll form</div>,
}));
vi.mock("@/features/sync/components/RegenerateBackupCodesForm", () => ({
  default: () => <div>Regenerate form</div>,
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: MfaSettings } = await import("./MfaSettings");

describe("MfaSettings", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u1", email: "a@b.com" } as never });
    mockGetVerifiedTotpFactor.mockReset();
    mockCountRemainingBackupCodes.mockReset();
    mockUnenrollTotp.mockReset();
  });

  it("renders nothing when signed out", () => {
    useAuthStore.setState({ user: null });
    const { container } = render(<MfaSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the enable button when no factor is enrolled", async () => {
    mockGetVerifiedTotpFactor.mockResolvedValue(null);

    render(<MfaSettings />);

    expect(await screen.findByRole("button", { name: "Enable Two-Factor Authentication" })).toBeInTheDocument();
  });

  it("shows enabled status and remaining backup codes when a factor is enrolled", async () => {
    mockGetVerifiedTotpFactor.mockResolvedValue({ id: "factor-1" });
    mockCountRemainingBackupCodes.mockResolvedValue(7);

    render(<MfaSettings />);

    expect(await screen.findByText("Two-factor authentication is enabled")).toBeInTheDocument();
    expect(screen.getByText("7 of 10 backup codes remaining")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate Backup Codes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("opens the enroll drawer when not enrolled", async () => {
    mockGetVerifiedTotpFactor.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<MfaSettings />);

    await user.click(await screen.findByRole("button", { name: "Enable Two-Factor Authentication" }));
    expect(await screen.findByText("Enroll form")).toBeInTheDocument();
  });

  it("opens the disable-confirm form when a factor is enrolled", async () => {
    mockGetVerifiedTotpFactor.mockResolvedValue({ id: "factor-1" });
    mockCountRemainingBackupCodes.mockResolvedValue(10);

    const user = userEvent.setup();
    render(<MfaSettings />);

    await user.click(await screen.findByRole("button", { name: "Disable" }));
    expect(await screen.findByText("Disabling two-factor authentication means signing in will only require your password.")).toBeInTheDocument();
  });

  it("disables 2FA and refreshes back to the enable button", async () => {
    mockGetVerifiedTotpFactor.mockResolvedValueOnce({ id: "factor-1" }).mockResolvedValueOnce(null);
    mockCountRemainingBackupCodes.mockResolvedValue(10);
    mockUnenrollTotp.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<MfaSettings />);

    await user.click(await screen.findByRole("button", { name: "Disable" }));
    const confirmButtons = await screen.findAllByRole("button", { name: "Disable" });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => expect(screen.getByRole("button", { name: "Enable Two-Factor Authentication" })).toBeInTheDocument());
  });
});
