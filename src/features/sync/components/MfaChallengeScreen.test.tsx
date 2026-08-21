import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockChallengeAndVerify = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockRedeemBackupCode = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      mfa: {
        challengeAndVerify: (...args: unknown[]) => mockChallengeAndVerify(...args),
      },
    },
  },
}));

vi.mock("@/features/sync/backupCodes", () => ({
  redeemBackupCode: (...args: unknown[]) => mockRedeemBackupCode(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: MfaChallengeScreen } = await import("./MfaChallengeScreen");

describe("MfaChallengeScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      mfaPending: true,
      mfaFactorId: "factor-1",
      mfaError: null,
      loading: false,
    });
    mockChallengeAndVerify.mockReset();
    mockGetSession.mockReset().mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSignOut.mockReset().mockResolvedValue({ error: null });
    mockRedeemBackupCode.mockReset();
    sessionStorage.clear();
  });

  it("shows the code entry form by default", () => {
    render(<MfaChallengeScreen />);
    expect(screen.getByText("Verify it's you")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("submits the code via verifyMfaCode", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<MfaChallengeScreen />);

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(mockChallengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
    expect(useAuthStore.getState().mfaPending).toBe(false);
  });

  it("switches to the backup code field and submits via verifyBackupCode", async () => {
    mockRedeemBackupCode.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<MfaChallengeScreen />);

    await user.click(screen.getByText("Use a backup code instead"));
    expect(screen.getByLabelText("Backup code")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Backup code"), "ABCDE-FGHJK");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(mockRedeemBackupCode).toHaveBeenCalledWith("u1", "ABCDE-FGHJK");
  });

  it("shows mfaError after a rejected code", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: null, error: { message: "Invalid code" } });
    const user = userEvent.setup();
    render(<MfaChallengeScreen />);

    await user.type(screen.getByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("Invalid code")).toBeInTheDocument();
  });

  it("cancel signs out and clears the challenge", async () => {
    const user = userEvent.setup();
    render(<MfaChallengeScreen />);

    await user.click(screen.getByText("Cancel"));

    expect(mockSignOut).toHaveBeenCalled();
    expect(useAuthStore.getState().mfaPending).toBe(false);
  });
});
