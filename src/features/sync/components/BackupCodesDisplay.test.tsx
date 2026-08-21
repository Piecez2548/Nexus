import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BackupCodesDisplay from "./BackupCodesDisplay";
import { useToastStore } from "@/store/toastStore";

describe("BackupCodesDisplay", () => {
  beforeEach(() => {
    // jsdom has no Clipboard API at all -- define a stub rather than
    // spying on a real one that doesn't exist here (see Vault.integration.test.tsx).
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("lists every code", () => {
    render(<BackupCodesDisplay codes={["AAAAA-11111", "BBBBB-22222"]} onDone={() => {}} />);
    expect(screen.getByText("AAAAA-11111")).toBeInTheDocument();
    expect(screen.getByText("BBBBB-22222")).toBeInTheDocument();
  });

  it("copies all codes and shows a confirmation toast", async () => {
    useToastStore.setState({ toasts: [] });
    const user = userEvent.setup();
    render(<BackupCodesDisplay codes={["AAAAA-11111", "BBBBB-22222"]} onDone={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(useToastStore.getState().toasts.some((t) => t.message === "Backup codes copied")).toBe(true);
  });

  it("calls onDone when acknowledged", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<BackupCodesDisplay codes={["AAAAA-11111"]} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "I've saved these codes" }));
    expect(onDone).toHaveBeenCalled();
  });
});
