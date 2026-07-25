import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRecoverDekFromEscrow = vi.fn();
vi.mock("@/features/encryption/recovery/recoverDekFromEscrow", () => ({
  recoverDekFromEscrow: (...args: unknown[]) => mockRecoverDekFromEscrow(...args),
  RecoveryNotAvailableError: class RecoveryNotAvailableError extends Error {},
}));

import AppLockGate from "./AppLockGate";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import { db } from "@/database/db";

const SYNCED_TABLES = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
] as const;

async function resetStore() {
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
  useAuthStore.setState({ user: null, lastSyncedAt: null });
  for (const table of SYNCED_TABLES) {
    await db.table(table).clear();
  }
}

describe("AppLockGate", () => {
  beforeEach(async () => {
    await resetStore();
    mockRecoverDekFromEscrow.mockReset();
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

  describe("cross-device encryption catch-up", () => {
    async function seedEncryptedTransaction() {
      await db.transactions.add({
        syncId: "enc-1",
        updatedAt: "2026-07-25T00:00:00.000Z",
        encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
      } as never);
    }

    it("shows the catch-up recovery screen when encrypted data exists locally, signed in, with no PIN set up at all", async () => {
      await seedEncryptedTransaction();
      useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });

      render(
        <AppLockGate>
          <p>Protected content</p>
        </AppLockGate>
      );

      expect(await screen.findByText("พบข้อมูลที่เข้ารหัสจากอุปกรณ์อื่น")).toBeInTheDocument();
      expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    });

    it("does not show the catch-up screen when not signed in", async () => {
      await seedEncryptedTransaction();

      render(
        <AppLockGate>
          <p>Protected content</p>
        </AppLockGate>
      );

      expect(screen.getByText("Protected content")).toBeInTheDocument();
      expect(screen.queryByText("พบข้อมูลที่เข้ารหัสจากอุปกรณ์อื่น")).not.toBeInTheDocument();
    });

    it("does not show the catch-up screen once the session DEK is already resident", async () => {
      await seedEncryptedTransaction();
      useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
      const dek = await generateDek();
      useEncryptionSessionStore.getState().setDek(dek);

      render(
        <AppLockGate>
          <p>Protected content</p>
        </AppLockGate>
      );

      expect(screen.getByText("Protected content")).toBeInTheDocument();
    });

    it("reveals children after completing the recovery flow from the catch-up screen", async () => {
      await seedEncryptedTransaction();
      useAuthStore.setState({ user: { id: "u1", email: "me@nexus.app" } as never });
      mockRecoverDekFromEscrow.mockResolvedValue(await generateDek());

      const user = userEvent.setup();
      render(
        <AppLockGate>
          <p>Protected content</p>
        </AppLockGate>
      );

      await screen.findByText("พบข้อมูลที่เข้ารหัสจากอุปกรณ์อื่น");
      await user.type(screen.getByLabelText("อีเมล"), "me@nexus.app");
      await user.type(screen.getByLabelText("รหัสผ่านบัญชี Sync"), "correct-password");
      await user.click(screen.getByRole("button", { name: "กู้คืน" }));

      await user.type(await screen.findByLabelText("PIN ใหม่"), "1234");
      await user.type(screen.getByLabelText("ยืนยัน PIN ใหม่"), "1234");
      await user.click(screen.getByRole("button", { name: "ตั้ง PIN ใหม่" }));

      expect(await screen.findByText("Protected content")).toBeInTheDocument();
    });
  });
});
