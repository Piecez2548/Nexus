import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguageStore } from "@/store/languageStore";

import ScanControls from "./ScanControls";

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("ScanControls", () => {
  it("shows Pause (not Resume) while running, and calls onPause", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    render(<ScanControls running onPause={onPause} onResume={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("shows Resume (not Pause) while paused, and calls onResume", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(<ScanControls running={false} onPause={() => {}} onResume={onResume} onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("always shows Cancel, regardless of running state", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ScanControls running onPause={() => {}} onResume={() => {}} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel scan" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
