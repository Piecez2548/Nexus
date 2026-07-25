import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
