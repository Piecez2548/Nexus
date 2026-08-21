import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockListFactors = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
      },
    },
  },
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: LoginScreen } = await import("./LoginScreen");

describe("LoginScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      initialized: false,
      sessionChecked: false,
      loading: false,
      error: null,
      needsEmailConfirmation: false,
      syncing: false,
      lastSyncedAt: null,
      mfaPending: false,
      mfaFactorId: null,
      mfaError: null,
      emailVerificationPending: false,
      pendingVerificationEmail: null,
      emailVerificationError: null,
    });
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it("shows a sign-in form by default", () => {
    render(<LoginScreen />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("signs in with email and password", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });

    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "password123" });
  });

  it("switches to the sign-up form and submits it with the new profile fields", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "new@user.com" }, session: { access_token: "token" } },
      error: null,
    });

    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByRole("tab", { name: "Sign Up" }));
    expect(screen.getByText("Create your account")).toBeInTheDocument();

    await user.type(screen.getByLabelText("First Name"), "Ada");
    await user.type(screen.getByLabelText("Last Name"), "Lovelace");
    await user.type(screen.getByLabelText("Phone Number"), "812345678");
    await user.type(screen.getByLabelText("Email"), "new@user.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@user.com",
      password: "password123",
      options: { data: { first_name: "Ada", last_name: "Lovelace", phone: "+66812345678" } },
    });
  });

  it("does not show the sign-up-only profile fields while in sign-in mode", () => {
    render(<LoginScreen />);

    expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Last Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Phone Number")).not.toBeInTheDocument();
  });

  it("shows a validation icon only after a field is touched, reflecting its current validity", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    const email = screen.getByLabelText("Email");
    expect(email.parentElement?.querySelector("svg")).not.toBeInTheDocument();

    await user.type(email, "not-an-email");
    await user.tab();
    expect(email.parentElement?.querySelector(".text-red-400")).toBeInTheDocument();

    await user.type(email, "@b.com");
    await user.tab();
    expect(email.parentElement?.querySelector(".text-emerald-400")).toBeInTheDocument();
  });

  it("shows an error message on failed sign-in", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid credentials" } });

    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
