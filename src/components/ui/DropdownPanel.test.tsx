import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import DropdownPanel from "./DropdownPanel";

describe("DropdownPanel", () => {
  it("renders nothing when closed", () => {
    render(
      <DropdownPanel open={false}>
        <p>Content</p>
      </DropdownPanel>
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children when open", () => {
    render(
      <DropdownPanel open>
        <p>Content</p>
      </DropdownPanel>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies the given className to the panel", () => {
    render(
      <DropdownPanel open className="my-panel-class">
        <p>Content</p>
      </DropdownPanel>
    );
    expect(screen.getByText("Content").parentElement).toHaveClass("my-panel-class");
  });
});
