import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {},
}));

const { useAppLockStore } = await import("@/store/appLockStore");
const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: EncryptionSettings } = await import("./EncryptionSettings");

function resetStores() {
  sessionStorage.clear();
  localStorage.clear();
  useAppLockStore.setState({
    pinHash: null,
    salt: null,
    autoLockMinutes: 0,
    rememberUntil: null,
    sessionUnlocked: false,
    lastActivityAt: Date.now(),
    encryptionEnabled: false,
    wrappedDek: null,
    kekSalt: null,
    kekIterations: null,
  });
  useAuthStore.setState({ user: null });
}

describe("EncryptionSettings", () => {
  beforeEach(() => {
    resetStores();
  });

  it("shows a sign-in prompt when not signed in to Sync", () => {
    render(<EncryptionSettings />);
    expect(screen.getByText(/sign in to sync first/i)).toBeInTheDocument();
  });

  it("shows a set-up-PIN prompt when signed in but no App Lock PIN exists yet", () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });

    render(<EncryptionSettings />);
    expect(screen.getByText(/set up an app lock pin first/i)).toBeInTheDocument();
  });

  it("shows the rollout warning and an Enable Encryption button once signed in with a PIN set up", async () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
    await useAppLockStore.getState().setupPin("1234", false);

    render(<EncryptionSettings />);

    expect(screen.getByText(/any other device signed in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enable encryption/i })).toBeInTheDocument();
  });

  it("opens the enable-encryption drawer when the button is clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
    await useAppLockStore.getState().setupPin("1234", false);

    const user = userEvent.setup();
    render(<EncryptionSettings />);

    await user.click(screen.getByRole("button", { name: /enable encryption/i }));

    expect(await screen.findByText("เปิดใช้งานการเข้ารหัสข้อมูล")).toBeInTheDocument();
  });

  it("shows the enabled status and an update-recovery-key option once encryption has been turned on", () => {
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
    useAppLockStore.setState({ pinHash: "hash", salt: "salt", encryptionEnabled: true });

    render(<EncryptionSettings />);

    expect(screen.getByText(/encryption is enabled/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enable encryption/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update recovery key/i })).toBeInTheDocument();
  });

  it("opens the update-recovery-key drawer when that button is clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
    useAppLockStore.setState({ pinHash: "hash", salt: "salt", encryptionEnabled: true });

    const user = userEvent.setup();
    render(<EncryptionSettings />);

    await user.click(screen.getByRole("button", { name: /update recovery key/i }));

    expect(await screen.findByText("อัปเดตกุญแจสำรอง", { selector: "h2" })).toBeInTheDocument();
  });
});
