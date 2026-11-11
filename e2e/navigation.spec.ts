import { test, expect } from "@playwright/test";

test.describe("sidebar navigation", () => {
  test("every sidebar link loads without a runtime error", async ({ page }) => {
    await page.goto("/dashboard");
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

    // Trading/Portfolio and the external Nexus Tools link were removed.
    await expect(page.getByRole("button", { name: "Trading", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Nexus Tools/ })).toHaveCount(0);

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
