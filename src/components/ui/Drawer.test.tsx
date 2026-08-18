import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Drawer from "./Drawer";

describe("Drawer", () => {
  it("renders nothing when closed", () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("shows a back button that closes it, even when the form inside provides none", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Drawer open onClose={onClose}>
        <p>Content</p>
      </Drawer>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has dialog semantics", () => {
    render(
      <Drawer open onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus into the drawer when it opens", async () => {
    render(
      <Drawer open onClose={() => {}}>
        <button type="button">First field</button>
      </Drawer>
    );

    // The close button is the first focusable descendant of the panel.
    await waitFor(() => expect(screen.getByRole("button", { name: "Back" })).toHaveFocus());
  });

  it("returns focus to whatever triggered it once closed", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Drawer open={open} onClose={() => setOpen(false)}>
            <p>Content</p>
          </Drawer>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    await user.click(trigger);

    await waitFor(() => expect(screen.getByRole("button", { name: "Back" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Drawer open onClose={onClose}>
        <p>Content</p>
      </Drawer>
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Back" })).toHaveFocus());

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus within the drawer instead of escaping to the page behind it", async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside the drawer</button>
        <Drawer open onClose={() => {}}>
          <input aria-label="Name" />
          <button type="button">Save</button>
        </Drawer>
      </>
    );

    const back = screen.getByRole("button", { name: "Back" });
    const nameField = screen.getByLabelText("Name");
    const save = screen.getByRole("button", { name: "Save" });

    await waitFor(() => expect(back).toHaveFocus());

    await user.tab();
    expect(nameField).toHaveFocus();
    await user.tab();
    expect(save).toHaveFocus();
    // Tabbing past the last focusable element wraps back to the first,
    // rather than escaping to "Outside the drawer".
    await user.tab();
    expect(back).toHaveFocus();

    // Shift+Tab from the first element wraps to the last.
    await user.tab({ shift: true });
    expect(save).toHaveFocus();
  });
});
