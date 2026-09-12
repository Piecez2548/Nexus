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

    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();

    await page.getByRole("link", { name: "Todo" }).click();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
  });

  test("adds, edits, reloads, and deletes a transaction from the mobile UI", async ({ page }) => {
    await page.goto("/transactions");
    const mobileList = page.locator(".space-y-3.md\\:hidden");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Mobile CRUD check");
    await page.getByLabel("Amount").fill("250");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account", { exact: true }).selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();

    await expect(mobileList.getByText("Mobile CRUD check", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit Mobile CRUD check" }).click();
    await page.getByLabel("Amount").fill("275");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(mobileList.getByText("฿275", { exact: true })).toBeVisible();

    await page.reload();
    await expect(mobileList.getByText("Mobile CRUD check", { exact: true })).toBeVisible();
    await expect(mobileList.getByText("฿275", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete Mobile CRUD check" }).click();
    await expect(mobileList.getByText("Mobile CRUD check", { exact: true })).toHaveCount(0);
  });

  // Representative check for the Deeper Trading Analytics batch's new
  // entity forms -- Strategies has the most fields (two textareas) of the
  // three, so a layout/scroll regression there is the most likely to show.
  test("the Strategies drawer form works on a narrow viewport", async ({ page }) => {
    await page.goto("/trading/strategies");

    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByLabel("Strategy name").fill("Mobile Test Strategy");
    await page.getByLabel("Entry rules").fill("Some entry rule");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Mobile Test Strategy")).toBeVisible();

    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Add Strategy" })).not.toBeVisible();
  });
});
