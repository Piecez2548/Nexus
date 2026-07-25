import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppLockGate from "./AppLockGate";
import { useAppLockStore } from "@/store/appLockStore";

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
  });
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
});
