import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ErrorBoundary from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("Boom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("catches a render error and shows a fallback instead of crashing", () => {
    // React logs the caught error to the console by default; silence it so
    // the expected-failure test doesn't spam the test output.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload App" })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("reloads the page when the reload button is clicked", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: "Reload App" }));
    expect(reloadMock).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
