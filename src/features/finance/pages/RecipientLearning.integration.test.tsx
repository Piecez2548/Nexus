import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Transactions from "./Transactions";
import TransactionDrawer from "@/features/finance/components/TransactionDrawer";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useUIStore } from "@/features/finance/store/uiStore";

function renderTransactionsPage() {
  return render(
    <>
      <Transactions />
      <TransactionDrawer />
    </>
  );
}

describe("Rule Engine / Learning Engine (end to end through the real UI)", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.accounts.clear();
    await db.categories.clear();
    await db.recipientProfiles.clear();
    await db.merchants.clear();

    useTransactionStore.setState({ transactions: [], loading: false });
    useAccountStore.setState({ accounts: [] });
    useCategoryStore.setState({ categories: [] });
    useUIStore.setState({ isTransactionDrawerOpen: false, selectedTransaction: null });

    await db.accounts.bulkAdd([{ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" }]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Transport", type: "expense", icon: "car", color: "#3b82f6" },
    ]);
  });

  it("learns a recipient's category on first use and auto-applies it on the next visit", async () => {
    const user = userEvent.setup();
    renderTransactionsPage();

    // --- First transaction: user manually picks the category, providing a recipient. ---
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.type(await screen.findByLabelText("ชื่อรายการ"), "ก๋วยเตี๋ยว");
    await user.type(screen.getByLabelText("จำนวนเงิน"), "58");
    await user.type(screen.getByLabelText("ผู้รับ / เบอร์โทร / PromptPay"), "0812345678");
    await user.selectOptions(screen.getByLabelText("หมวดหมู่"), "Food");
    await user.selectOptions(screen.getByLabelText("บัญชี"), "Cash");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(async () => {
      expect(await db.recipientProfiles.toArray()).toHaveLength(1);
    });

    const profile = (await db.recipientProfiles.toArray())[0];
    expect(profile.recipientKey).toBe("0812345678");
    expect(profile.category).toBe("Food");
    expect(profile.transactionCount).toBe(1);

    // --- Second transaction: same recipient, different title — category should auto-fill. ---
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.type(await screen.findByLabelText("ชื่อรายการ"), "เที่ยงวันนี้");
    await user.type(screen.getByLabelText("จำนวนเงิน"), "65");
    await user.type(screen.getByLabelText("ผู้รับ / เบอร์โทร / PromptPay"), "0812345678");

    await waitFor(() => {
      expect(screen.getByLabelText("หมวดหมู่")).toHaveValue("Food");
    });
    expect(await screen.findByText(/แนะนำหมวดหมู่/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("บัญชี"), "Cash");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(async () => {
      expect(await db.transactions.toArray()).toHaveLength(2);
    });

    const updatedProfile = (await db.recipientProfiles.toArray())[0];
    expect(updatedProfile.transactionCount).toBe(2);
    expect(updatedProfile.totalAmount).toBe(123);
  });

  it("suggests a category from the merchant database when the title matches a known merchant", async () => {
    await db.merchants.add({ name: "Starbucks", category: "Food" });

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.type(await screen.findByLabelText("ชื่อรายการ"), "Starbucks Siam");
    await user.type(screen.getByLabelText("จำนวนเงิน"), "150");

    await waitFor(() => {
      expect(screen.getByLabelText("หมวดหมู่")).toHaveValue("Food");
    });
    expect(await screen.findByText(/ฐานข้อมูลร้านค้า/)).toBeInTheDocument();
  });
});
