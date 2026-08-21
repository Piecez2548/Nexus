import { test, expect } from "@playwright/test";

test.describe("Watchlist", () => {
  test("add, edit, and delete a watchlist item end to end", async ({ page }) => {
    await page.goto("/trading/watchlist");

    await page.getByRole("button", { name: "Add to Watchlist" }).click();
    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Target price").fill("200");
    await page.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("row").filter({ hasText: "AAPL" });
    await expect(row).toBeVisible();
    await expect(row.getByText("200")).toBeVisible();

    await page.getByRole("button", { name: "Edit AAPL" }).click();
    await page.getByLabel("Target price").fill("250");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row").filter({ hasText: "AAPL" }).getByText("250")).toBeVisible();

    await page.getByRole("button", { name: "Delete AAPL" }).click();
    await expect(page.getByRole("row").filter({ hasText: "AAPL" })).toHaveCount(0);
    await expect(page.getByText("Your watchlist is empty")).toBeVisible();
  });

  test("no live price is ever fetched -- target price is exactly what was entered, unchanged after reload", async ({ page }) => {
    await page.goto("/trading/watchlist");

    await page.getByRole("button", { name: "Add to Watchlist" }).click();
    await page.getByLabel("Symbol").fill("TSLA");
    await page.getByLabel("Target price").fill("321.5");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row").filter({ hasText: "TSLA" }).getByText("321.5")).toBeVisible();

    await page.reload();
    // Still exactly the entered value -- no background price fetch overwrote it.
    await expect(page.getByRole("row").filter({ hasText: "TSLA" }).getByText("321.5")).toBeVisible();
  });

  test("saves successfully with no target price (optional field left empty)", async ({ page }) => {
    await page.goto("/trading/watchlist");

    await page.getByRole("button", { name: "Add to Watchlist" }).click();
    await page.getByLabel("Symbol").fill("MSFT");
    await page.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("row").filter({ hasText: "MSFT" });
    await expect(row).toBeVisible();
    // Target Price is the 3rd column (Symbol, Market, Target Price, Notes,
    // Actions) -- both it and Notes render "-" when empty, so scope to the
    // specific cell rather than a bare row-wide text match.
    await expect(row.getByRole("cell").nth(2)).toHaveText("-");
  });

  test("shows a validation error instead of saving with no symbol", async ({ page }) => {
    await page.goto("/trading/watchlist");

    await page.getByRole("button", { name: "Add to Watchlist" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Symbol is required")).toBeVisible();
  });
});
