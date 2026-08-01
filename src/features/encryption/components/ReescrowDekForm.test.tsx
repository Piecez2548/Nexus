import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReescrowDek = vi.fn();

vi.mock("@/features/encryption/migration/reescrowDek", () => ({
  reescrowDek: (...args: unknown[]) => mockReescrowDek(...args),
  ReescrowFailedError: class ReescrowFailedError extends Error {},
}));

const { default: ReescrowDekForm } = await import("./ReescrowDekForm");
const { ReescrowFailedError } = await import("@/features/encryption/migration/reescrowDek");

describe("ReescrowDekForm", () => {
  beforeEach(() => {
    mockReescrowDek.mockReset();
  });

  it("validates that a password was entered", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ReescrowDekForm onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Update recovery key" }));

    expect(screen.getByText("Enter your Sync account password")).toBeInTheDocument();
    expect(mockReescrowDek).not.toHaveBeenCalled();
  });

  it("calls reescrowDek with the entered password and calls onDone on success", async () => {
    mockReescrowDek.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ReescrowDekForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Current Sync Account Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Update recovery key" }));

    expect(mockReescrowDek).toHaveBeenCalledWith("correct-password");
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("shows an error and does not call onDone when reescrowDek fails", async () => {
    mockReescrowDek.mockRejectedValue(new ReescrowFailedError("รหัสผ่านบัญชี Sync ไม่ถูกต้อง"));

    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ReescrowDekForm onDone={onDone} />);

    await user.type(screen.getByLabelText("Current Sync Account Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Update recovery key" }));

    expect(await screen.findByText("รหัสผ่านบัญชี Sync ไม่ถูกต้อง")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
