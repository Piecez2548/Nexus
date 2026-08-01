import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
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
    });
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
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

  it("switches to the sign-up form and submits it", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u1", email: "new@user.com" }, session: { access_token: "token" } },
      error: null,
    });

    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    expect(screen.getByText("Create your account")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "new@user.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockSignUp).toHaveBeenCalledWith({ email: "new@user.com", password: "password123" });
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
