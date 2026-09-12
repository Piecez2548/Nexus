import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useClickOutside } from "./useClickOutside";

function Fixture({ dismiss }: { dismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, dismiss);
  return <><div ref={ref}><button aria-expanded="true">Trigger</button><button>Action</button></div><button>Outside</button></>;
}

describe("useClickOutside", () => {
  it("dismisses outside pointer events but not inside ones", () => {
    const dismiss = vi.fn();
    render(<Fixture dismiss={dismiss} />);
    fireEvent.mouseDown(screen.getByText("Action"));
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(dismiss).toHaveBeenCalledOnce();
  });
  it("Escape inside restores the trigger; Escape elsewhere does not steal focus", () => {
    const dismiss = vi.fn();
    render(<Fixture dismiss={dismiss} />);
    screen.getByText("Action").focus();
    fireEvent.keyDown(screen.getByText("Action"), { key: "Escape" });
    expect(dismiss).toHaveBeenCalledOnce();
    expect(screen.getByText("Trigger")).toHaveFocus();
    screen.getByText("Outside").focus();
    dismiss.mockClear();
    fireEvent.keyDown(screen.getByText("Outside"), { key: "Escape" });
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Outside")).toHaveFocus();
  });
  it("uses the latest callback for focus leaving and cleans up listeners", () => {
    const oldDismiss = vi.fn();
    const dismiss = vi.fn();
    const { rerender, unmount } = render(<Fixture dismiss={oldDismiss} />);
    rerender(<Fixture dismiss={dismiss} />);
    screen.getByText("Outside").focus();
    expect(oldDismiss).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledOnce();
    unmount();
    fireEvent.mouseDown(document.body);
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
