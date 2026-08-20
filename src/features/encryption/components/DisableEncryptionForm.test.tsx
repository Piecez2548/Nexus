import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockDisableEncryption = vi.fn();

vi.mock("@/features/encryption/migration/disableEncryption", () => ({
  disableEncryption: (...args: unknown[]) => mockDisableEncryption(...args),
}));

const { default: DisableEncryptionForm } = await import("./DisableEncryptionForm");

describe("DisableEncryptionForm", () => {
  beforeEach(() => {
    mockDisableEncryption.mockReset();
  });

  it("shows the plaintext, Vault, and recovery-key warnings up front", () => {
    render(<DisableEncryptionForm onDone={vi.fn()} />);

    expect(screen.getByText(/decrypted back to plaintext/)).toBeInTheDocument();
    expect(screen.getByText(/Vault will become inaccessible/)).toBeInTheDocument();
    expect(screen.getByText(/recovery key will be removed/)).toBeInTheDocument();
  });

  it("validates that a PIN is entered before submitting", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DisableEncryptionForm onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Disable Encryption" }));

    expect(screen.getByText("Enter your PIN")).toBeInTheDocument();
    expect(mockDisableEncryption).not.toHaveBeenCalled();
  });

  it("calls disableEncryption with the entered PIN, then calls onDone on success", async () => {
    mockDisableEncryption.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DisableEncryptionForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Disable Encryption" }));

    expect(mockDisableEncryption).toHaveBeenCalledWith(expect.objectContaining({ pin: "1234" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows migration progress as it's reported via onProgress", async () => {
    mockDisableEncryption.mockImplementation(async ({ onProgress }) => {
      onProgress({ phase: "backup" });
      onProgress({ phase: "decrypting", tableIndex: 2, tableCount: 9, currentTable: "trades" });
    });

    const user = userEvent.setup();
    render(<DisableEncryptionForm onDone={vi.fn()} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Disable Encryption" }));

    expect(await screen.findByText(/3\/9/)).toBeInTheDocument();
  });

  it("shows an error message and does not call onDone when disableEncryption fails", async () => {
    mockDisableEncryption.mockRejectedValue(new Error("Incorrect PIN"));

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DisableEncryptionForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "0000");
    await user.click(screen.getByRole("button", { name: "Disable Encryption" }));

    expect(await screen.findByText("Incorrect PIN")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
