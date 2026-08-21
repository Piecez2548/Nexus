import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();
const mockListFactors = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
      },
    },
  },
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: EmailVerificationScreen } = await import("./EmailVerificationScreen");

describe("EmailVerificationScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      emailVerificationPending: true,
      pendingVerificationEmail: "new@user.com",
      emailVerificationError: null,
      needsEmailConfirmation: true,
      loading: false,
    });
    mockVerifyOtp.mockReset();
    mockResend.mockReset();
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it("shows the code entry form with the pending email", () => {
    render(<EmailVerificationScreen />);
    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(screen.getByText("Enter the code we sent to new@user.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("submits the code via verifyEmailOtp", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1", email: "new@user.com" } }, error: null });
    const user = userEvent.setup();
    render(<EmailVerificationScreen />);

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(mockVerifyOtp).toHaveBeenCalledWith({ email: "new@user.com", token: "123456", type: "signup" });
    expect(useAuthStore.getState().emailVerificationPending).toBe(false);
    expect(useAuthStore.getState().user).toMatchObject({ id: "u1" });
  });

  it("shows emailVerificationError after a rejected code", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "Token has expired or is invalid" } });
    const user = userEvent.setup();
    render(<EmailVerificationScreen />);

    await user.type(screen.getByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("Token has expired or is invalid")).toBeInTheDocument();
  });

  it("resends the code via resendEmailVerification", async () => {
    mockResend.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<EmailVerificationScreen />);

    await user.click(screen.getByText("Resend code"));

    expect(mockResend).toHaveBeenCalledWith({ type: "signup", email: "new@user.com" });
  });

  it("cancel resets the pending verification state without calling Supabase", async () => {
    const user = userEvent.setup();
    render(<EmailVerificationScreen />);

    await user.click(screen.getByText("Cancel"));

    expect(useAuthStore.getState().emailVerificationPending).toBe(false);
    expect(useAuthStore.getState().pendingVerificationEmail).toBeNull();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
