import { test, expect } from "@playwright/test";

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hides the sidebar and shows the bottom tab bar with a working FAB", async ({ page }) => {
    await page.goto("/");

    // The desktop sidebar's logo text shouldn't render on a mobile viewport.
    await expect(page.getByText("Life Operating System")).not.toBeVisible();

    // The bottom tab bar takes over navigation.
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /transactions/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /budget/i })).toBeVisible();

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeVisible();
    // On a narrow mobile viewport the drawer panel spans the full screen
    // width (see Drawer.tsx), leaving no backdrop gap to click outside of —
    // must use its dedicated close button instead of a corner click.
    await page.getByRole("button", { name: "Back" }).click();

    await page.getByRole("link", { name: /transactions/i }).click();
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  });

  test("the More menu surfaces the rest of the navigation", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();

    await page.getByRole("link", { name: "Todo" }).click();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
  });
});
