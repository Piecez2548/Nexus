import { test, expect } from "@playwright/test";

test.describe("top bar", () => {
  test("theme toggle switches between light and dark mode", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const wasDark = await html.evaluate((el) => el.classList.contains("dark"));

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveClass(wasDark ? /(?!.*dark)/ : /dark/);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveClass(wasDark ? /dark/ : /(?!.*dark)/);
  });

  test("notifications bell opens a dropdown with real budget alerts", async ({ page }) => {
    await page.goto("/budget");
    await page.getByRole("button", { name: "Add Budget" }).click();
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Amount").fill("100");
    await page.getByRole("button", { name: "Save" }).click();

    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Big lunch");
    await page.getByLabel("Amount").fill("200");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("Big lunch")).toBeVisible();

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText(/เกินแล้ว/)).toBeVisible();
  });

  test("user menu navigates to Settings and can lock the app", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "User menu" }).click();
    await expect(page.getByRole("button", { name: "Lock App" })).not.toBeVisible();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Enable App Lock" }).click();
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN", { exact: true }).fill("1234");
    await page.getByRole("button", { name: "Set Up PIN" }).click();

    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("button", { name: "Lock App" }).click();
    await expect(page.getByRole("heading", { name: "Unlock Nexus" })).toBeVisible();

    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByRole("button", { name: "Unlock" }).click();
  });

  test("search finds a transaction and navigates to it", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Starbucks Coffee");
    await page.getByLabel("Amount").fill("120");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("Starbucks Coffee")).toBeVisible();

    await page.goto("/");
    await page.getByPlaceholder("Search anything...").fill("starbucks");
    await page.getByRole("button", { name: "Starbucks Coffee" }).click();
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  });
});
