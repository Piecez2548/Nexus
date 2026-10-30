import { expect, test } from "@playwright/test";

const featurePaths = [
  "/finance", "/ai-analytics", "/transactions", "/favorites", "/budget",
  "/goals", "/accounts", "/net-worth", "/subscriptions", "/categories",
  "/merchants", "/recipients", "/reports", "/trading", "/trading/journal",
  "/trading/portfolio", "/trading/strategies", "/trading/watchlist",
  "/trading/economic-calendar", "/executive", "/todo", "/habits",
  "/schedule", "/vault", "/workouts",
] as const;

test("desktop navigation exposes every Main workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");

  const sidebar = page.locator("[data-shell-audit=sidebar]");
  for (const group of ["Finance", "Trading", "Personal"]) {
    const trigger = sidebar.getByRole("button", { name: group, exact: true });
    if ((await trigger.getAttribute("aria-expanded")) === "false") await trigger.click();
  }

  for (const path of featurePaths) {
    await expect(sidebar.locator(`a[href="${path}"]`), path).toBeVisible();
  }
});

test("mobile More menu exposes every Main workspace", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const tabBar = page.locator("[data-shell-audit=mobile-navigation]");
  // Daily workspaces live on the bottom tab bar; the More menu holds the rest.
  const tabBarPaths = ["/transactions", "/budget"];
  for (const path of tabBarPaths) {
    await expect(tabBar.locator(`a[href="${path}"]`), path).toBeVisible();
  }
  await tabBar.getByRole("button", { name: "More", exact: true }).click();

  const menu = page.getByRole("dialog");
  for (const path of featurePaths.filter((path) => !tabBarPaths.includes(path))) {
    await expect(menu.locator(`a[href="${path}"]`), path).toBeVisible();
  }
});
