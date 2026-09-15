import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import AuthGate from "@/features/sync/components/AuthGate";
import { useAuthStore } from "@/features/sync/store/authStore";
import ProjectHub from "./ProjectHub";

vi.mock("@/lib/supabaseClient", () => ({ isSyncConfigured: true, supabase: null }));
vi.mock("@/features/sync/syncEngine", () => ({ runFullSync: vi.fn() }));

describe("project hub shared authentication", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    useAuthStore.setState({ initialized: true, sessionChecked: true, user: null, mfaPending: false, emailVerificationPending: false });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not mount project links or hub styles before login", () => {
    render(<AuthGate><ProjectHub /></AuthGate>);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "เข้าสู่ Nexus Main" })).not.toBeInTheDocument();
    expect(document.querySelector(".project-hub")).toBeNull();
  });

  it("reveals the hub with an existing session, reuses it for Main, and gates logout", () => {
    useAuthStore.setState({ user: { id: "test-user" } as User });
    const { rerender } = render(<AuthGate><ProjectHub /></AuthGate>);
    expect(screen.getByRole("link", { name: "เข้าสู่ Nexus Main" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "เข้าสู่ DataLens" })).toHaveAttribute("href", "https://datalens-kappa-one.vercel.app/");
    expect(screen.getByRole("link", { name: "เข้าสู่ AlgoViz" })).toHaveAttribute("href", "/algoviz");
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
    expect(document.querySelector(".project-hub")).not.toBeNull();
    rerender(<AuthGate><p>Main workspace</p></AuthGate>);
    expect(screen.getByText("Main workspace")).toBeInTheDocument();
    expect(document.querySelector(".project-hub")).toBeNull();
    act(() => { useAuthStore.setState({ user: null }); });
    expect(screen.queryByText("Main workspace")).not.toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("shows the signed-in profile and updates it when the account changes", () => {
    useAuthStore.setState({ user: { id: "test-user", email: "ada@example.com", app_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z", user_metadata: { first_name: "Ada", last_name: "Lovelace" } } as User });
    render(<AuthGate><ProjectHub /></AuthGate>);
    expect(screen.getByRole("button", { name: "เมนูบัญชี Ada Lovelace" })).toHaveAttribute("aria-expanded", "false");
    act(() => { useAuthStore.setState({ user: { id: "second-user", email: "second@example.com", user_metadata: {} } as User }); });
    expect(screen.getByText("second@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("unmounts hub presentation and motion when a session is removed", () => {
    useAuthStore.setState({ user: { id: "test-user" } as User });
    render(<AuthGate><ProjectHub /></AuthGate>);
    act(() => { useAuthStore.setState({ user: null }); });
    expect(screen.queryByRole("link", { name: "เข้าสู่ Nexus Main" })).not.toBeInTheDocument();
    expect(document.querySelector(".project-hub")).toBeNull();
    expect(document.body.dataset.motion).toBeUndefined();
  });
});
