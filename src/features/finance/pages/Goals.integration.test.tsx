import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Goals from "./Goals";
import { db } from "@/database/db";
import { useGoalStore } from "@/features/finance/store/goalStore";

describe("Goals page", () => {
  beforeEach(async () => {
    await db.goals.clear();
    useGoalStore.setState({ goals: [], loading: false, error: null });
  });

  it("creates a new goal and shows it with 0% progress", async () => {
    const user = userEvent.setup();
    render(<Goals />);

    await user.click(screen.getByRole("button", { name: /add goal/i }));
    await user.type(await screen.findByLabelText("ชื่อเป้าหมาย"), "MacBook");
    await user.type(screen.getByLabelText("เป้าหมาย (บาท)"), "60000");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("MacBook")).toBeInTheDocument();
    expect(screen.getByText("฿0 / ฿60,000")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("contributes toward a goal and updates its progress", async () => {
    await db.goals.add({ name: "MacBook", targetAmount: 60000, currentAmount: 10000 });

    const user = userEvent.setup();
    render(<Goals />);

    const input = await screen.findByLabelText("Contribute to MacBook");
    await user.type(input, "5000");
    await user.click(screen.getByRole("button", { name: "Add contribution to MacBook" }));

    await waitFor(() => {
      expect(screen.getByText("฿15,000 / ฿60,000")).toBeInTheDocument();
    });
  });

  it("marks a goal complete once currentAmount reaches the target", async () => {
    await db.goals.add({ name: "Emergency Fund", targetAmount: 10000, currentAmount: 10000 });

    render(<Goals />);

    expect(await screen.findByText("สำเร็จแล้ว 🎉")).toBeInTheDocument();
  });

  it("deletes a goal", async () => {
    await db.goals.add({ name: "MacBook", targetAmount: 60000, currentAmount: 0 });

    const user = userEvent.setup();
    render(<Goals />);

    await user.click(await screen.findByRole("button", { name: "Delete MacBook" }));

    await waitFor(() => {
      expect(screen.getByText("No saving goals yet")).toBeInTheDocument();
    });
  });
});
