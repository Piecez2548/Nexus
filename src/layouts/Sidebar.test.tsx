import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("shows Settings but no Trading group or external Nexus Tools link", () => {
    render(<Sidebar />, { wrapper: MemoryRouter });

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Trading/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Nexus Tools/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nexus Tools/ })).not.toBeInTheDocument();
  });
});
