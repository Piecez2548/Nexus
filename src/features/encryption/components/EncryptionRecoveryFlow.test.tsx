import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRecoverDekFromEscrow = vi.fn();

vi.mock("@/features/encryption/recovery/recoverDekFromEscrow", () => ({
  recoverDekFromEscrow: (...args: unknown[]) => mockRecoverDekFromEscrow(...args),
  RecoveryNotAvailableError: class RecoveryNotAvailableError extends Error {},
}));

const { default: EncryptionRecoveryFlow } = await import("./EncryptionRecoveryFlow");
const { useAppLockStore } = await import("@/store/appLockStore");
const { useEncryptionSessionStore } = await import("@/features/encryption/store/encryptionSessionStore");
const { generateDek } = await import("@/features/encryption/crypto/encryption");
const { RecoveryNotAvailableError } = await import("@/features/encryption/recovery/recoverDekFromEscrow");

describe("EncryptionRecoveryFlow", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAppLockStore.setState({
      pinHash: null,
      salt: null,
      encryptionEnabled: false,
      wrappedDek: null,
      kekSalt: null,
      kekIterations: null,
    });
    useEncryptionSessionStore.getState().clearDek();
    mockRecoverDekFromEscrow.mockReset();
  });

  it("recovers the DEK, sets a new PIN, and calls onDone", async () => {
    const dek = await generateDek();
    mockRecoverDekFromEscrow.mockResolvedValue(dek);

    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EncryptionRecoveryFlow onDone={onDone} />);

    await user.type(screen.getByLabelText("อีเมล"), "me@nexus.app");
    await user.type(screen.getByLabelText("รหัสผ่านบัญชี Sync"), "correct-password");
    await user.click(screen.getByRole("button", { name: "กู้คืน" }));

    expect(mockRecoverDekFromEscrow).toHaveBeenCalledWith("me@nexus.app", "correct-password");

    await user.type(await screen.findByLabelText("PIN ใหม่"), "1234");
    await user.type(screen.getByLabelText("ยืนยัน PIN ใหม่"), "1234");
    await user.click(screen.getByRole("button", { name: "ตั้ง PIN ใหม่" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    expect(useEncryptionSessionStore.getState().dek).toBe(dek);
  });

  it("shows the recovery-specific error message when credentials are invalid", async () => {
    mockRecoverDekFromEscrow.mockRejectedValue(new RecoveryNotAvailableError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));

    const user = userEvent.setup();
    render(<EncryptionRecoveryFlow onDone={vi.fn()} />);

    await user.type(screen.getByLabelText("อีเมล"), "me@nexus.app");
    await user.type(screen.getByLabelText("รหัสผ่านบัญชี Sync"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "กู้คืน" }));

    expect(await screen.findByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeInTheDocument();
    // Stays on the credentials step — never reaches the new-PIN screen.
    expect(screen.queryByLabelText("PIN ใหม่")).not.toBeInTheDocument();
  });

  it("shows a generic error message for an unexpected failure", async () => {
    mockRecoverDekFromEscrow.mockRejectedValue(new Error("network exploded"));

    const user = userEvent.setup();
    render(<EncryptionRecoveryFlow onDone={vi.fn()} />);

    await user.type(screen.getByLabelText("อีเมล"), "me@nexus.app");
    await user.type(screen.getByLabelText("รหัสผ่านบัญชี Sync"), "correct-password");
    await user.click(screen.getByRole("button", { name: "กู้คืน" }));

    expect(await screen.findByText("เกิดข้อผิดพลาดระหว่างกู้คืน ลองอีกครั้ง")).toBeInTheDocument();
  });

  it("validates the new PIN is at least 4 digits and both entries match", async () => {
    mockRecoverDekFromEscrow.mockResolvedValue(await generateDek());

    const user = userEvent.setup();
    render(<EncryptionRecoveryFlow onDone={vi.fn()} />);

    await user.type(screen.getByLabelText("อีเมล"), "me@nexus.app");
    await user.type(screen.getByLabelText("รหัสผ่านบัญชี Sync"), "correct-password");
    await user.click(screen.getByRole("button", { name: "กู้คืน" }));

    await user.type(await screen.findByLabelText("PIN ใหม่"), "12");
    await user.click(screen.getByRole("button", { name: "ตั้ง PIN ใหม่" }));
    expect(await screen.findByText("PIN ต้องมีอย่างน้อย 4 หลัก")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("PIN ใหม่"));
    await user.type(screen.getByLabelText("PIN ใหม่"), "1234");
    await user.type(screen.getByLabelText("ยืนยัน PIN ใหม่"), "5678");
    await user.click(screen.getByRole("button", { name: "ตั้ง PIN ใหม่" }));
    expect(await screen.findByText("PIN ไม่ตรงกัน กรุณายืนยันอีกครั้ง")).toBeInTheDocument();
  });

  it("shows a back button and calls onCancel when provided", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<EncryptionRecoveryFlow onDone={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "ย้อนกลับ" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("hides the back button when onCancel is not provided", () => {
    render(<EncryptionRecoveryFlow onDone={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "ย้อนกลับ" })).not.toBeInTheDocument();
  });

  it("uses custom title/description when provided", () => {
    render(
      <EncryptionRecoveryFlow onDone={vi.fn()} title="Custom title" description="Custom description" />
    );

    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });
});
