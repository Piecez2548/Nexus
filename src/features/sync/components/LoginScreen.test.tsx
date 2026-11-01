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

  it("toggles password visibility with an accessible button", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("clears typed values when switching tabs and keeps the right autocomplete hints", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    await user.click(screen.getByRole("tab", { name: "Sign Up" }));
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("First Name")).toHaveAttribute("autocomplete", "given-name");
  });

  it("fills the seal ring as the form is completed and unlocks when ready", async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginScreen />);
    const ring = () => container.querySelector(".seal-ring") as SVGElement;

    expect(ring().getAttribute("stroke-dashoffset")).toBe("320.44");
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    expect(Number(ring().getAttribute("stroke-dashoffset"))).toBeCloseTo(160.22, 1);
    await user.type(screen.getByLabelText("Password"), "123456");
    expect(Number(ring().getAttribute("stroke-dashoffset"))).toBe(0);
    expect(ring()).toHaveClass("full");
  });

  it("shows a strength meter only when signing up", async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginScreen />);
    expect(container.querySelector(".login-strength")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Sign Up" }));
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "Abcdef1!");
    expect(container.querySelectorAll(".login-strength .on")).toHaveLength(4);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("disables the submit button while the request is pending so it cannot be sent twice", async () => {
    let finish: (value: unknown) => void = () => {};
    mockSignInWithPassword.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const busy = await screen.findByRole("button", { name: /Verifying/ });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    finish({ data: { user: null }, error: { message: "nope" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("nope");
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
