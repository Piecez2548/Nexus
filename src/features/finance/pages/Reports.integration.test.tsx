import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Reports from "./Reports";
import { db } from "@/database/db";
import { toLocalDateString } from "@/utils/localDate";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";

// The real export functions call jsPDF's doc.save()/downloadFile(), which
// in this test environment actually writes a file to disk via a clicked
// <a download> element -- mocked here so these tests verify the page wires
// the right button to the right export call, without littering the repo
// with real PDF/CSV files on every run. The export functions themselves
// are covered directly by financialSummaryPdf.test.ts/financialSummaryCsv
// .test.ts/aiAnalyticsReportPdf.test.ts.
vi.mock("@/features/finance/utils/financialSummaryPdf", () => ({
  downloadFinancialSummaryPdf: vi.fn(),
}));
vi.mock("@/features/finance/utils/aiAnalyticsReportPdf", () => ({
  downloadAiAnalyticsReportPdf: vi.fn(),
}));
vi.mock("@/utils/download", () => ({
  downloadFile: vi.fn(),
}));

import { downloadFinancialSummaryPdf } from "@/features/finance/utils/financialSummaryPdf";
import { downloadAiAnalyticsReportPdf } from "@/features/finance/utils/aiAnalyticsReportPdf";
import { downloadFile } from "@/utils/download";

const now = new Date();
const thisMonth = (day: number) => toLocalDateString(new Date(now.getFullYear(), now.getMonth(), day));

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

describe("Reports page", () => {
  beforeEach(async () => {
    await resetAll();
    vi.clearAllMocks();
  });

  it("shows the empty state with no transactions", async () => {
    render(<Reports />);
    expect(await screen.findByText("Add some transactions first to generate a report")).toBeInTheDocument();
  });

  it("defaults to the Financial Summary tab and can switch to the AI Analytics Report tab", async () => {
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.transactions.bulkAdd([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: thisMonth(1), status: "completed" },
      { title: "Groceries", amount: 400, type: "expense", category: "Food", account: "Cash", date: thisMonth(3), status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<Reports />);

    expect(await screen.findByText("Monthly income/expense/saving totals and a category breakdown, ready to export")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI Analytics Report" }));
    expect(await screen.findByText("Your Executive Summary and Financial Health Score highlights as a PDF")).toBeInTheDocument();
  });

  it("wires the Financial Summary PDF and CSV buttons to the right export calls", async () => {
    await db.transactions.add({
      title: "Salary",
      amount: 30000,
      type: "income",
      category: "Salary",
      account: "Bank",
      date: thisMonth(1),
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Reports />);

    await screen.findByText("Monthly income/expense/saving totals and a category breakdown, ready to export");

    await user.click(screen.getByRole("button", { name: "PDF" }));
    expect(downloadFinancialSummaryPdf).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "CSV" }));
    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(expect.stringContaining(".csv"), expect.any(String), expect.stringContaining("text/csv"));
  });

  it("wires the AI Analytics Report PDF button to the right export call", async () => {
    await db.transactions.add({
      title: "Salary",
      amount: 30000,
      type: "income",
      category: "Salary",
      account: "Bank",
      date: thisMonth(1),
      status: "completed",
    });

    const user = userEvent.setup();
    render(<Reports />);

    await user.click(await screen.findByRole("button", { name: "AI Analytics Report" }));
    await user.click(screen.getByRole("button", { name: "PDF" }));
    expect(downloadAiAnalyticsReportPdf).toHaveBeenCalledTimes(1);
  });
});
