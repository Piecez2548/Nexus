import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ToastContainer from "./ToastContainer";
import { useToastStore } from "@/store/toastStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when there are no toasts", () => {
    render(<ToastContainer />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders a toast message when one is shown", () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().show("success", "Transaction added");
    });

    expect(screen.getByText("Transaction added")).toBeInTheDocument();
  });

  it("dismisses a toast when its close button is clicked", async () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().show("error", "Something failed");
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    await waitFor(() => {
      expect(screen.queryByText("Something failed")).not.toBeInTheDocument();
    });
  });
});
