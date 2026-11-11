import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguageStore } from "@/store/languageStore";

import ScanSuccessBurst from "./ScanSuccessBurst";

beforeEach(() => {
  vi.useFakeTimers();
  useLanguageStore.setState({ language: "en" });
});
afterEach(() => vi.useRealTimers());

describe("ScanSuccessBurst", () => {
  it("announces how many slips were saved and dismisses itself", () => {
    const onDone = vi.fn();
    render(<ScanSuccessBurst count={3} onDone={onDone} />);

    expect(screen.getByRole("status")).toHaveTextContent("Saved 3 slips");
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
