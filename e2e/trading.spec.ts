import { test, expect } from "@playwright/test";

test.describe("trade lifecycle", () => {
  test("add, close, and delete a trade end to end", async ({ page }) => {
    await page.goto("/trading/journal");

    // --- Add (open position) ---
    await page.getByRole("button", { name: "Add Trade" }).click();

    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Entry Price").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("row").filter({ hasText: "AAPL" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Open")).toBeVisible();

    // --- Edit: close the position by filling in an exit price (status is derived) ---
    await page.getByRole("button", { name: "Edit AAPL" }).click();
    await page.getByLabel("Exit Price").fill("130");
    await page.getByLabel("Exit Date").fill("2026-07-21");
    await page.getByRole("button", { name: "Save" }).click();

    const closedRow = page.getByRole("row").filter({ hasText: "AAPL" });
    await expect(closedRow.getByText("Win")).toBeVisible();
    await expect(closedRow.getByText("300")).toBeVisible(); // (130-100)*10

    // --- Delete ---
    await page.getByRole("button", { name: "Delete AAPL" }).click();
    await expect(page.getByRole("row").filter({ hasText: "AAPL" })).toHaveCount(0);
  });

  test("shows a validation error instead of saving an invalid trade", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Entry Price").fill("100");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Symbol is required")).toBeVisible();
  });

  test("closed trades are reflected in the Trading Dashboard stats", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("MSFT");
    await page.getByLabel("Entry Price").fill("300");
    await page.getByLabel("Lot Size").fill("5");
    await page.getByLabel("Exit Price").fill("330");
    await page.getByLabel("Exit Date").fill("2026-07-21");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("MSFT")).toBeVisible();

    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
    // Scoped to the heading: the Strategy Comparison table (added by the
    // Deeper Trading Analytics batch) also renders "100.0%" as this trade's
    // win rate, making a bare text match ambiguous now.
    await expect(page.getByRole("heading", { name: "100.0%" })).toBeVisible(); // win rate
    await expect(page.getByRole("table").getByText("MSFT")).toBeVisible(); // recent trades
  });

  test("AI market detection fills the market field from the symbol", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("XAUUSD");

    await expect(page.getByLabel("Market (AI auto-detected)")).toHaveValue("cfd");
  });

  test("risk calculator computes and applies a suggested lot size", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("EURUSD");
    await page.getByLabel("Entry Price").fill("100");
    await page.getByLabel("Stop Loss").fill("90");
    await page.getByLabel("Risk %").fill("1");
    await page.getByLabel("Account Balance").fill("10000");

    await page.getByRole("button", { name: "Apply to Lot Size" }).click();

    await expect(page.getByLabel("Lot Size")).toHaveValue("10");
  });

  test("trading table search filters rows and CSV export downloads a file", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Entry Price").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByRole("button", { name: "Save" }).click();
    const table = page.getByRole("table");
    await expect(table.getByText("AAPL")).toBeVisible();

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("MSFT");
    await page.getByLabel("Entry Price").fill("300");
    await page.getByLabel("Lot Size").fill("5");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(table.getByText("MSFT")).toBeVisible();

    await page.getByPlaceholder("Search symbol or strategy...").fill("AAPL");
    await expect(table.getByText("AAPL")).toBeVisible();
    await expect(table.getByText("MSFT")).not.toBeVisible();

    await page.getByPlaceholder("Search symbol or strategy...").fill("");
    await expect(table.getByText("MSFT")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/nexus-trades-.*\.csv/);
  });
});

test.describe("Trade Replay", () => {
  test("shows a read-only entry -> position -> exit -> reflection timeline matching the trade's own data", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Entry Price").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByLabel("Stop Loss").fill("95");
    await page.getByLabel("Exit Price").fill("120");
    await page.getByLabel("Exit Date").fill("2026-07-21");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("AAPL")).toBeVisible();

    await page.getByRole("button", { name: "View replay for AAPL" }).click();
    const replayDialog = page.getByRole("dialog");

    await expect(replayDialog.getByRole("heading", { level: 3, name: "Entry" })).toBeVisible();
    await expect(replayDialog.getByRole("heading", { level: 3, name: "Position" })).toBeVisible();
    await expect(replayDialog.getByRole("heading", { level: 3, name: "Exit" })).toBeVisible();
    await expect(replayDialog.getByRole("heading", { level: 3, name: "Reflection" })).toBeVisible();

    // Values shown are drawn from the trade itself -- not a separate,
    // divergent computation. Scoped to the dialog since the table behind it
    // (still in the DOM) also shows these same numbers in its own columns.
    await expect(replayDialog.getByText("100", { exact: true })).toBeVisible(); // entry price
    await expect(replayDialog.getByText("120", { exact: true })).toBeVisible(); // exit price
    await expect(replayDialog.getByText("95", { exact: true })).toBeVisible(); // stop loss
    await expect(replayDialog.getByText("Win")).toBeVisible();

    // Genuinely read-only -- no input/select/textarea anywhere in the view.
    await expect(replayDialog.locator("input, select, textarea")).toHaveCount(0);
  });
});

test.describe("Strategy Comparison", () => {
  test("shows the same win rate and P/L for a strategy as the trade itself, not a divergent computation", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("Symbol").fill("NVDA");
    await page.getByLabel("Entry Price").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByLabel("Exit Price").fill("150");
    await page.getByLabel("Exit Date").fill("2026-07-21");
    await page.getByLabel("Strategy").fill("Swing Trade");
    await page.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("table").getByRole("row").filter({ hasText: "NVDA" });
    await expect(row).toBeVisible();
    await expect(row.getByText("500")).toBeVisible(); // (150-100)*10

    await page.goto("/trading");
    const comparisonRow = page.getByRole("row").filter({ hasText: "Swing Trade" });
    await expect(comparisonRow).toBeVisible();
    await expect(comparisonRow.getByText("100.0%")).toBeVisible(); // win rate: the one trade won
    await expect(comparisonRow.getByText("500")).toBeVisible(); // same total P/L as the trade row
  });
});
