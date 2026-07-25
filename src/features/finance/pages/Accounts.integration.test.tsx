import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Accounts from "./Accounts";
import { db } from "@/database/db";
import { useAccountStore } from "@/features/finance/store/accountStore";

describe("Accounts page (add / edit / delete flow)", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    useAccountStore.setState({ accounts: [], loading: false, error: null });
  });

  it("adds a new account and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<Accounts />);

    await user.click(screen.getByRole("button", { name: /add account/i }));

    await user.type(await screen.findByLabelText("ชื่อบัญชี"), "Savings");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("Savings")).toBeInTheDocument();
    expect((await db.accounts.toArray())[0].name).toBe("Savings");
  });

  it("edits an existing account in place", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#3b82f6" });

    const user = userEvent.setup();
    render(<Accounts />);

    await user.click(await screen.findByRole("button", { name: "Edit Cash" }));

    const nameInput = await screen.findByLabelText("ชื่อบัญชี");
    expect(nameInput).toHaveValue("Cash");

    await user.clear(nameInput);
    await user.type(nameInput, "Wallet");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("Wallet")).toBeInTheDocument();
    expect(screen.queryByText("Cash")).not.toBeInTheDocument();
  });

  it("deletes an account with no transactions", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#3b82f6" });

    const user = userEvent.setup();
    render(<Accounts />);

    await user.click(await screen.findByRole("button", { name: "Delete Cash" }));

    await waitFor(() => {
      expect(screen.queryByText("Cash")).not.toBeInTheDocument();
    });
  });

  it("shows an error instead of deleting an account that's in use", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#3b82f6" });
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Accounts />);

    await user.click(await screen.findByRole("button", { name: "Delete Cash" }));

    expect(await screen.findByText("ไม่สามารถลบบัญชีที่มีรายการอยู่ได้")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("merges an account into another, reassigning its transactions", async () => {
    await db.accounts.bulkAdd([
      { name: "Cash (dup)", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Cash", type: "cash", icon: "wallet", color: "#3b82f6" },
    ]);

    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash (dup)",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Accounts />);

    await user.click(await screen.findByRole("button", { name: "Merge Cash (dup)" }));

    const targetSelect = await screen.findByLabelText("รวมเข้ากับ");
    await user.selectOptions(targetSelect, "Cash");
    await user.click(screen.getByRole("button", { name: "รวมบัญชี" }));

    await waitFor(() => {
      expect(screen.queryByText("Cash (dup)")).not.toBeInTheDocument();
    });

    const transactions = await db.transactions.toArray();
    expect(transactions[0].account).toBe("Cash");

    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Cash");
  });
});
