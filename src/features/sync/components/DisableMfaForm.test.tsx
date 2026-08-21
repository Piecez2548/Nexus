import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUnenrollTotp = vi.fn();

vi.mock("@/features/sync/mfa", () => ({
  unenrollTotp: (...args: unknown[]) => mockUnenrollTotp(...args),
}));

const { default: DisableMfaForm } = await import("./DisableMfaForm");

describe("DisableMfaForm", () => {
  beforeEach(() => {
    mockUnenrollTotp.mockReset();
  });

  it("unenrolls the given factor and calls onDone on success", async () => {
    mockUnenrollTotp.mockResolvedValue(undefined);
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<DisableMfaForm factorId="factor-1" onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Disable" }));

    expect(mockUnenrollTotp).toHaveBeenCalledWith("factor-1");
    expect(onDone).toHaveBeenCalled();
  });

  it("shows an error and does not call onDone when unenroll fails", async () => {
    mockUnenrollTotp.mockRejectedValue(new Error("failed"));
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<DisableMfaForm factorId="factor-1" onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Disable" }));

    expect(await screen.findByText("Could not start two-factor setup. Try again.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
