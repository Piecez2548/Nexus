import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import MobileMoreMenu from "./MobileMoreMenu";

describe("MobileMoreMenu", () => {
  it("renders nothing when closed", () => {
    render(<MobileMoreMenu open={false} onClose={() => {}} />, { wrapper: MemoryRouter });
    expect(screen.queryByText("Menu")).not.toBeInTheDocument();
  });

  it("lists every section's nav links, plus Settings, when open", () => {
    render(<MobileMoreMenu open onClose={() => {}} />, { wrapper: MemoryRouter });

    expect(screen.getByText("Finance Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("Trading Journal")).toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("closes when a nav link is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MobileMoreMenu open onClose={onClose} />, { wrapper: MemoryRouter });

    await user.click(screen.getByText("Todo"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes via the drawer's back button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MobileMoreMenu open onClose={onClose} />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
