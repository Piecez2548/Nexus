import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import TopBar from "./TopBar";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useGamificationStore } from "@/store/gamificationStore";

function SettingsStub() {
  return <p>Settings Page</p>;
}

function renderTopBar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TopBar />
      <Routes>
        <Route path="/settings" element={<SettingsStub />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TopBar", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.trades.clear();
    useTransactionStore.setState({ transactions: [], loading: false });
    useBudgetStore.setState({ budgets: [] });
    useTradeStore.setState({ trades: [], loading: false, error: null });
    useAppSettingsStore.setState({ themeMode: "light" });
    useAppLockStore.setState({ pinHash: null, salt: null, sessionUnlocked: false, rememberUntil: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
    document.documentElement.classList.remove("dark");
  });

  it("toggles dark mode when the theme button is clicked", async () => {
    const user = userEvent.setup();
    renderTopBar();

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(useAppSettingsStore.getState().themeMode).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(useAppSettingsStore.getState().themeMode).toBe("light");
  });

  it("shows a budget-over-limit notification in the bell dropdown", async () => {
    await db.budgets.add({ category: "Food", amount: 1000, period: "monthly" });
    await db.transactions.add({
      title: "Big lunch",
      amount: 1200,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: new Date().toISOString().slice(0, 10),
      status: "completed",
    });

    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText(/เกินแล้ว/)).toBeInTheDocument();
  });

  it("shows an empty state in the bell dropdown with no notifications", async () => {
    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("No new notifications")).toBeInTheDocument();
  });

  it("navigates to Settings from the user menu", async () => {
    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByText("Settings Page")).toBeInTheDocument();
  });

  it("only shows Lock App in the user menu when App Lock is enabled", async () => {
    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: "User menu" }));
    expect(screen.queryByRole("button", { name: "Lock App" })).not.toBeInTheDocument();
  });

  it("shows Lock App and locks the session when App Lock is enabled", async () => {
    useAppLockStore.setState({ pinHash: "hash", salt: "salt", sessionUnlocked: true });

    const user = userEvent.setup();
    renderTopBar();

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await user.click(screen.getByRole("button", { name: "Lock App" }));

    expect(useAppLockStore.getState().sessionUnlocked).toBe(false);
  });

  it("searches transactions and navigates to the result", async () => {
    await db.transactions.add({
      title: "Starbucks Coffee",
      amount: 120,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TopBar />
        <Routes>
          <Route path="/transactions" element={<p>Transactions Page</p>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Search anything..."), "starbucks");
    const result = await screen.findByText("Starbucks Coffee");
    await user.click(result);

    expect(await screen.findByText("Transactions Page")).toBeInTheDocument();
  });

  it("shows the current level and streak, with XP progress in the popover", async () => {
    useGamificationStore.setState({ xp: 150, streak: 3, lastActiveDate: new Date().toISOString().slice(0, 10) });

    const user = userEvent.setup();
    renderTopBar();

    expect(await screen.findByText("Lv.2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Level and streak" }));
    expect(screen.getByText("50 / 100 XP")).toBeInTheDocument();
    expect(screen.getByText("3 day streak")).toBeInTheDocument();
  });
});
