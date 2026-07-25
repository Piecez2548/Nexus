import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Categories from "./Categories";
import { db } from "@/database/db";
import { useCategoryStore } from "@/features/finance/store/categoryStore";

describe("Categories page (add / edit / delete / merge flow)", () => {
  beforeEach(async () => {
    await db.categories.clear();
    await db.transactions.clear();
    useCategoryStore.setState({ categories: [], loading: false, error: null });
  });

  it("adds a new category and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<Categories />);

    await user.click(screen.getByRole("button", { name: /add category/i }));

    await user.type(await screen.findByLabelText("ชื่อหมวดหมู่"), "Groceries");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("deletes a category with no transactions", async () => {
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });

    const user = userEvent.setup();
    render(<Categories />);

    await user.click(await screen.findByRole("button", { name: "Delete Food" }));

    await waitFor(() => {
      expect(screen.queryByText("Food")).not.toBeInTheDocument();
    });
  });

  it("shows an error instead of deleting a category that's in use", async () => {
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.transactions.add({
      title: "Lunch",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Categories />);

    await user.click(await screen.findByRole("button", { name: "Delete Food" }));

    expect(
      await screen.findByText("ไม่สามารถลบหมวดหมู่ที่มีรายการอยู่ได้ ลองรวมหมวดหมู่แทน")
    ).toBeInTheDocument();
  });

  it("merges a category into another, reassigning its transactions", async () => {
    await db.categories.bulkAdd([
      { name: "Lunch", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Food", type: "expense", icon: "utensils", color: "#f59e0b" },
    ]);

    await db.transactions.add({
      title: "Pad Thai",
      amount: 60,
      type: "expense",
      category: "Lunch",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Categories />);

    await user.click(await screen.findByRole("button", { name: "Merge Lunch" }));

    const targetSelect = await screen.findByLabelText("รวมเข้ากับ");
    await user.selectOptions(targetSelect, "Food");
    await user.click(screen.getByRole("button", { name: "รวมหมวดหมู่" }));

    await waitFor(() => {
      expect(screen.queryByText("Lunch")).not.toBeInTheDocument();
    });

    const transactions = await db.transactions.toArray();
    expect(transactions[0].category).toBe("Food");
  });
});
