import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AiAnalytics from "./AiAnalytics";
import { db } from "@/database/db";
import { toLocalDateString } from "@/utils/localDate";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";

const now = new Date();
const thisMonth = (day: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth(), day));
const lastMonth = (day: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, day));

async function resetAll() {
  await Promise.all([
    db.transactions.clear(),
    db.budgets.clear(),
    db.categories.clear(),
    db.goals.clear(),
    db.recipientProfiles.clear(),
    db.goalMilestoneEvents.clear(),
  ]);

  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useCategoryStore.setState({ categories: [], loading: false });
  useGoalStore.setState({ goals: [], loading: false, error: null });
  useRecipientProfileStore.setState({ profiles: [], loading: false, error: null });
  useGoalMilestoneEventStore.setState({ events: [], loading: false, error: null });
}

describe("AiAnalytics page", () => {
  beforeEach(async () => {
    await resetAll();
  });

  it("shows the empty state with no transactions", async () => {
    render(<AiAnalytics />);
    expect(await screen.findByText("Add some transactions to see your financial analysis")).toBeInTheDocument();
  });

  it("renders every section with real numbers once seeded with meaningful data", async () => {
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.budgets.add({ category: "Food", amount: 500, period: "monthly" });
    await db.recipientProfiles.add({
      recipientKey: "0812345678",
      alias: "Somchai Restaurant",
      category: "Food",
      transactionCount: 5,
      totalAmount: 2500,
      lastUsedDate: thisMonth(10),
      confidenceScore: 1,
    });

    await db.transactions.bulkAdd([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: lastMonth(1), status: "completed" },
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: thisMonth(1), status: "completed" },
      { title: "Groceries", amount: 400, type: "expense", category: "Food", account: "Cash", date: lastMonth(5), status: "completed" },
      { title: "Big dinner", amount: 900, type: "expense", category: "Food", account: "Cash", date: thisMonth(3), status: "completed" },
      { title: "Restaurant night out", amount: 600, type: "expense", category: "Food", account: "Cash", recipient: "0812345678", date: thisMonth(5), status: "completed" },
      { title: "New laptop", amount: 35000, type: "expense", category: "Shopping", account: "Bank", date: thisMonth(8), status: "completed" },
    ]);

    render(<AiAnalytics />);

    // Financial Health Score (Weighted) — Prompt 005's scoring system, now the page's sole health-score display.
    expect(await screen.findByText("Financial Health Score (Weighted)")).toBeInTheDocument();

    // Executive Summary — a flowing-paragraph digest of the same data.
    expect(await screen.findByText("Executive Summary")).toBeInTheDocument();

    // AI Insights — highest spending category / budget exceeded, etc.
    expect(await screen.findByText("AI Insights")).toBeInTheDocument();

    // Spending Analysis — the "Food" category should show up as a top category.
    expect(await screen.findByText("Spending Analysis")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);

    // Behavior Analysis — the recipient's alias should show up as a top merchant.
    expect(await screen.findByText("Behavior Analysis")).toBeInTheDocument();
    expect(screen.getAllByText("Somchai Restaurant").length).toBeGreaterThan(0);
    // Largest purchase — appears twice: once in Behavior Analysis's own
    // "Largest Purchases" card, once in Spending Analysis's "Largest
    // Transactions" card (both render the same behaviorAnalysis.largePurchases
    // data, deliberately — see LargestTransactionsList.tsx).
    expect(screen.getAllByText("New laptop")).toHaveLength(2);

    // Merchant Analysis — dedicated section (decision #2: no dual merchant
    // listing — this is now the sole home for the merchant's alias).
    expect(await screen.findByText("Merchant Analysis")).toBeInTheDocument();

    // Budget Analysis — the Food budget should show as over.
    expect(await screen.findByText("Budget Analysis")).toBeInTheDocument();
    expect(screen.getByText("Over Budget")).toBeInTheDocument();

    // Cash Flow Analysis — real income/expense figures. The figure is no
    // longer unique: the monthly-trend chart's visually-hidden data table
    // (A11Y screen-reader alternative) surfaces the same amount, and that
    // chart renders in both the Spending and Cash Flow sections.
    expect(await screen.findByText("Cash Flow Analysis")).toBeInTheDocument();
    expect(screen.getAllByText("฿30,000").length).toBeGreaterThan(0);

    // Forecast
    expect(await screen.findByText("Forecast")).toBeInTheDocument();

    // Recommendations — the over-budget Food category should suggest a reduction.
    // Appears twice: once in the standalone Recommendations section, once in
    // Executive Summary's Action Plan / Top Recommendations (both surface the
    // same underlying recommendation message, deliberately — pass-through reuse).
    expect(await screen.findByText("Recommendations")).toBeInTheDocument();
    expect(screen.getAllByText("Reduce Food spending").length).toBeGreaterThan(0);

    // Financial Timeline — a salary-received event should appear.
    expect(await screen.findByText("Financial Timeline")).toBeInTheDocument();
    expect(screen.getAllByText(/Salary received/).length).toBeGreaterThan(0);
  });

  it("opens the Category Insights drawer with real data when a top category is clicked", async () => {
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.recipientProfiles.add({
      recipientKey: "0812345678",
      alias: "Somchai Restaurant",
      category: "Food",
      transactionCount: 5,
      totalAmount: 2500,
      lastUsedDate: thisMonth(10),
      confidenceScore: 1,
    });

    await db.transactions.bulkAdd([
      { title: "Groceries", amount: 400, type: "expense", category: "Food", account: "Cash", date: lastMonth(5), status: "completed" },
      { title: "Big dinner", amount: 900, type: "expense", category: "Food", account: "Cash", date: thisMonth(3), status: "completed" },
      {
        title: "Restaurant night out",
        amount: 600,
        type: "expense",
        category: "Food",
        account: "Cash",
        recipient: "0812345678",
        date: thisMonth(5),
        status: "completed",
      },
    ]);

    const user = userEvent.setup();
    render(<AiAnalytics />);

    // Anchored to the start: the category button's accessible name is
    // "Food ฿1,900 (100.0%)" (category name first, then amount) — a bare
    // /Food/ substring match also catches the What-If panel's unrelated
    // "Reduce Food Spending" scenario tab once that section exists on the
    // same page.
    const categoryButton = await screen.findByRole("button", { name: /^Food/ });
    await user.click(categoryButton);

    expect(await screen.findByText("Food Insights")).toBeInTheDocument();
    expect(screen.getByText("฿1,900")).toBeInTheDocument(); // 400 + 900 + 600, this category's total in the drawer
  });
});
