import { test, expect } from "@playwright/test";

test.describe("Reports", () => {
  test("shows the empty state with no transactions", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("Add some transactions first to generate a report")).toBeVisible();
  });

  test("exports the Financial Summary as PDF and CSV, and the AI Analytics Report as PDF", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Coffee");
    await page.getByLabel("Amount").fill("120");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Coffee" })).toBeVisible();

    await page.goto("/reports");
    await expect(page.getByText("Monthly income/expense/saving totals and a category breakdown, ready to export")).toBeVisible();

    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF" }).click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/nexus-financial-summary-.*\.pdf/);

    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV" }).click();
    expect((await csvDownload).suggestedFilename()).toMatch(/nexus-financial-summary-.*\.csv/);

    await page.getByRole("button", { name: "AI Analytics Report" }).click();
    await expect(page.getByText("Your Executive Summary and Financial Health Score highlights as a PDF")).toBeVisible();

    const aiPdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF" }).click();
    expect((await aiPdfDownload).suggestedFilename()).toMatch(/nexus-ai-analytics-report-.*\.pdf/);
  });

  test("switching tabs does not carry a stale export button state (Financial Summary buttons gone on AI Analytics tab)", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Coffee");
    await page.getByLabel("Amount").fill("120");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Coffee" })).toBeVisible();

    await page.goto("/reports");
    await expect(page.getByRole("button", { name: "CSV" })).toBeVisible();

    await page.getByRole("button", { name: "AI Analytics Report" }).click();
    await expect(page.getByRole("button", { name: "CSV" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "PDF" })).toHaveCount(1);
  });
});
