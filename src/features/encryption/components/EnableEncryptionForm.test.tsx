import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockEnableEncryption = vi.fn();

vi.mock("@/features/encryption/migration/enableEncryption", () => ({
  enableEncryption: (...args: unknown[]) => mockEnableEncryption(...args),
}));

const { default: EnableEncryptionForm } = await import("./EnableEncryptionForm");

describe("EnableEncryptionForm", () => {
  beforeEach(() => {
    mockEnableEncryption.mockReset();
  });

  it("validates that a PIN and account password are entered before submitting", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EnableEncryptionForm onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Start Encrypting Data" }));

    expect(screen.getByText("Enter your PIN")).toBeInTheDocument();
    expect(mockEnableEncryption).not.toHaveBeenCalled();
  });

  it("calls enableEncryption with the entered PIN and password, then calls onDone on success", async () => {
    mockEnableEncryption.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EnableEncryptionForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "1234");
    await user.type(screen.getByLabelText("Confirm Sync Account Password"), "my-account-password");
    await user.click(screen.getByRole("button", { name: "Start Encrypting Data" }));

    expect(mockEnableEncryption).toHaveBeenCalledWith(
      expect.objectContaining({ pin: "1234", accountPassword: "my-account-password" })
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows migration progress as it's reported via onProgress", async () => {
    mockEnableEncryption.mockImplementation(async ({ onProgress }) => {
      onProgress({ phase: "backup" });
      onProgress({ phase: "encrypting", tableIndex: 2, tableCount: 9, currentTable: "trades" });
    });

    const user = userEvent.setup();
    render(<EnableEncryptionForm onDone={vi.fn()} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "1234");
    await user.type(screen.getByLabelText("Confirm Sync Account Password"), "my-account-password");
    await user.click(screen.getByRole("button", { name: "Start Encrypting Data" }));

    expect(await screen.findByText(/3\/9/)).toBeInTheDocument();
  });

  it("shows an error message and does not call onDone when enableEncryption fails", async () => {
    mockEnableEncryption.mockRejectedValue(new Error("Incorrect PIN"));

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EnableEncryptionForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Your Current PIN"), "0000");
    await user.type(screen.getByLabelText("Confirm Sync Account Password"), "my-account-password");
    await user.click(screen.getByRole("button", { name: "Start Encrypting Data" }));

    expect(await screen.findByText("Incorrect PIN")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
