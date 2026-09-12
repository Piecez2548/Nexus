import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { useModalA11y } from "./useModalA11y";

function Child({ close }: { close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose: close, containerRef: ref });
  return <div ref={ref} role="dialog" aria-label="Child"><button onClick={close}>Close child</button></div>;
}
function Parent({ close }: { close: () => void }) {
  const [child, setChild] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose: close, containerRef: ref });
  return <div ref={ref} role="dialog" aria-label="Parent"><button onClick={() => setChild(true)}>Open child</button>{child && <Child close={() => setChild(false)} />}</div>;
}
function Fixture() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open parent</button>{open && <Parent close={() => setOpen(false)} />}</>;
}
test("Escape closes only the top modal and restores the correct trigger", () => {
  render(<Fixture />);
  screen.getByText("Open parent").focus();
  fireEvent.click(screen.getByText("Open parent"));
  fireEvent.click(screen.getByText("Open child"));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Child" })).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Parent" })).toBeInTheDocument();
  expect(screen.getByText("Open child")).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Open parent")).toHaveFocus();
});
