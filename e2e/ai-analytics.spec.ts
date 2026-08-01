import { test, expect } from "@playwright/test";

test.describe("AI Analytics", () => {
  test("nav link navigates to the AI Analytics page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Finance" }).click();
    await page.getByRole("link", { name: "AI Analytics", exact: true }).click();

    await expect(page.getByRole("heading", { name: "AI Analytics" })).toBeVisible();
  });

  test("shows the empty state on a fresh profile with no transactions", async ({ page }) => {
    await page.goto("/ai-analytics");

    await expect(page.getByText("Add some transactions to see your financial analysis")).toBeVisible();
  });

  test("loads real sections once transactions exist", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Coffee");
    await page.getByLabel("Amount").fill("120");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Coffee" })).toBeVisible();

    await page.goto("/ai-analytics");

    await expect(page.getByRole("heading", { name: "AI Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Financial Health Score", exact: true })).toBeVisible();
    await expect(page.getByText("AI Insights")).toBeVisible();
    await expect(page.getByText("Spending Analysis")).toBeVisible();
    await expect(page.getByText("Behavior Profile")).toBeVisible();
    await expect(page.getByText("Financial Timeline")).toBeVisible();
  });
});
