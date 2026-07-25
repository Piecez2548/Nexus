import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppLockGate from "./AppLockGate";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";

function resetStore() {
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
  useEncryptionSessionStore.getState().clearDek();
}

describe("AppLockGate", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders children directly when app lock was never set up", () => {
    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("shows the unlock screen instead of children when locked", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    expect(screen.getByRole("heading", { name: "ปลดล็อก Nexus" })).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("reveals children after entering the correct PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    const user = userEvent.setup();
    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    await user.type(screen.getByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "ปลดล็อก" }));

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });

  it("shows an error and keeps content hidden on a wrong PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();

    const user = userEvent.setup();
    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    await user.type(screen.getByLabelText("PIN"), "0000");
    await user.click(screen.getByRole("button", { name: "ปลดล็อก" }));

    expect(await screen.findByText("PIN ไม่ถูกต้อง")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children directly when already unlocked (session/remembered)", () => {
    useAppLockStore.setState({ pinHash: "hash", salt: "salt", sessionUnlocked: true });

    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("still requires the PIN on a fresh session when encryption is enabled, even inside the remember window", async () => {
    await useAppLockStore.getState().setupPin("1234", true);
    const dek = await generateDek();
    await useAppLockStore.getState().attachEncryption("1234", dek);

    expect(useAppLockStore.getState().rememberUntil).not.toBeNull();

    // Simulate a genuinely fresh tab: sessionStorage-backed sessionUnlocked
    // resets, and the in-memory (never-persisted) DEK is gone too — but
    // the persisted "remember" window is still technically valid.
    useAppLockStore.setState({ sessionUnlocked: false });
    useEncryptionSessionStore.getState().clearDek();

    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    expect(screen.getByRole("heading", { name: "ปลดล็อก Nexus" })).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("shows a distinct error when the PIN is correct but the encryption state is corrupted", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    const dek = await generateDek();
    await useAppLockStore.getState().attachEncryption("1234", dek);
    useAppLockStore.getState().lock();

    // Corrupt the persisted salt so the derived KEK can't unwrap the DEK,
    // even though the PIN itself is correct.
    useAppLockStore.setState({ kekSalt: "AAAAAAAAAAAAAAAAAAAAAA==" });

    const user = userEvent.setup();
    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    await user.type(screen.getByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "ปลดล็อก" }));

    expect(await screen.findByText(/ไม่สามารถปลดล็อกข้อมูลที่เข้ารหัสไว้ได้/)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("skips the PIN screen when encryption is enabled and the session DEK is already resident", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    const dek = await generateDek();
    await useAppLockStore.getState().attachEncryption("1234", dek);

    render(
      <AppLockGate>
        <p>Protected content</p>
      </AppLockGate>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
