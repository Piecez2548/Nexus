import { test, expect } from "@playwright/test";

test.describe("sidebar navigation", () => {
  test("every sidebar link loads without a runtime error", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Finance is a collapsible group — expand it once, then its links stay visible.
    await page.getByRole("button", { name: "Finance" }).click();

    const financeLinks: Array<[label: string, heading: string | RegExp]> = [
      ["Finance Dashboard", "Finance Dashboard"],
      ["AI Analytics", "AI Analytics"],
      ["Transactions", "Transactions"],
      ["Favorites", "Favorites"],
      ["Budget", "Budget"],
      ["Goals", "Saving Goals"],
      ["Accounts", "Accounts"],
      ["Categories", "Categories"],
      ["Recipients", "Recipient Profiles"],
    ];

    for (const [label, heading] of financeLinks) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    }

    // Trading is a separate collapsible group.
    await page.getByRole("button", { name: "Trading" }).click();

    const tradingLinks: Array<[label: string, heading: string | RegExp]> = [
      ["Trading Dashboard", "Trading Dashboard"],
      ["Trading Journal", "Trading Journal"],
      ["Portfolio", "Portfolio"],
    ];

    for (const [label, heading] of tradingLinks) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    // Personal is a separate collapsible group.
    await page.getByRole("button", { name: "Personal" }).click();
    await page.getByRole("link", { name: "Todo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();

    await page.getByRole("link", { name: "Habit Tracker", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();

    await page.getByRole("link", { name: "Life Schedule", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Life Schedule" })).toBeVisible();

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("an unknown route shows a 404 with a way back", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

    await page.getByRole("link", { name: "Back to Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
