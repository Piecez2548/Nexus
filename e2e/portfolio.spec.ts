import { test, expect } from "@playwright/test";

test.describe("portfolio lifecycle", () => {
  test("add a holding, update its current price, and see the unrealized P/L reflect it", async ({ page }) => {
    await page.goto("/trading/portfolio");

    await page.getByRole("button", { name: "Add Holding" }).click();
    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Quantity").fill("10");
    await page.getByLabel("Average Cost Price").fill("100");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "AAPL" })).toBeVisible();
    await expect(page.getByText("Enter a current price to see P/L")).toBeVisible();

    await page.getByLabel("Update current price for AAPL").fill("120");
    await page.getByRole("button", { name: "Save price for AAPL" }).click();

    await expect(page.getByText("+200 (+20%)").first()).toBeVisible();
  });

  test("deletes a holding", async ({ page }) => {
    await page.goto("/trading/portfolio");

    await page.getByRole("button", { name: "Add Holding" }).click();
    await page.getByLabel("Symbol").fill("MSFT");
    await page.getByLabel("Quantity").fill("5");
    await page.getByLabel("Average Cost Price").fill("300");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "MSFT" })).toBeVisible();

    await page.getByRole("button", { name: "Delete MSFT" }).click();
    await expect(page.getByText("No holdings yet", { exact: false })).toBeVisible();
  });
});
