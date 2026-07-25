import { test, expect } from "@playwright/test";

test.describe("trade lifecycle", () => {
  test("add, close, and delete a trade end to end", async ({ page }) => {
    await page.goto("/trading/journal");

    // --- Add (open position) ---
    await page.getByRole("button", { name: "Add Trade" }).click();

    await page.getByLabel("สัญลักษณ์").fill("AAPL");
    await page.getByLabel("ราคาเข้า").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByRole("button", { name: "บันทึก" }).click();

    const row = page.getByRole("row").filter({ hasText: "AAPL" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Open")).toBeVisible();

    // --- Edit: close the position by filling in an exit price (status is derived) ---
    await page.getByRole("button", { name: "Edit AAPL" }).click();
    await page.getByLabel("ราคาออก").fill("130");
    await page.getByLabel("วันที่ออก").fill("2026-07-21");
    await page.getByRole("button", { name: "บันทึก" }).click();

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
    await page.getByLabel("ราคาเข้า").fill("100");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("กรุณากรอกสัญลักษณ์")).toBeVisible();
  });

  test("closed trades are reflected in the Trading Dashboard stats", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("สัญลักษณ์").fill("MSFT");
    await page.getByLabel("ราคาเข้า").fill("300");
    await page.getByLabel("Lot Size").fill("5");
    await page.getByLabel("ราคาออก").fill("330");
    await page.getByLabel("วันที่ออก").fill("2026-07-21");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByRole("table").getByText("MSFT")).toBeVisible();

    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: "Trading Dashboard" })).toBeVisible();
    await expect(page.getByText("100.0%")).toBeVisible(); // win rate
    await expect(page.getByRole("table").getByText("MSFT")).toBeVisible(); // recent trades
  });

  test("AI market detection fills the market field from the symbol", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("สัญลักษณ์").fill("XAUUSD");

    await expect(page.getByLabel("ตลาด (AI ตรวจจับอัตโนมัติ)")).toHaveValue("cfd");
  });

  test("risk calculator computes and applies a suggested lot size", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("สัญลักษณ์").fill("EURUSD");
    await page.getByLabel("ราคาเข้า").fill("100");
    await page.getByLabel("Stop Loss").fill("90");
    await page.getByLabel("Risk %").fill("1");
    await page.getByLabel("Account Balance").fill("10000");

    await page.getByRole("button", { name: "นำไปใช้กับ Lot Size" }).click();

    await expect(page.getByLabel("Lot Size")).toHaveValue("10");
  });

  test("trading table search filters rows and CSV export downloads a file", async ({ page }) => {
    await page.goto("/trading/journal");

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("สัญลักษณ์").fill("AAPL");
    await page.getByLabel("ราคาเข้า").fill("100");
    await page.getByLabel("Lot Size").fill("10");
    await page.getByRole("button", { name: "บันทึก" }).click();
    const table = page.getByRole("table");
    await expect(table.getByText("AAPL")).toBeVisible();

    await page.getByRole("button", { name: "Add Trade" }).click();
    await page.getByLabel("สัญลักษณ์").fill("MSFT");
    await page.getByLabel("ราคาเข้า").fill("300");
    await page.getByLabel("Lot Size").fill("5");
    await page.getByRole("button", { name: "บันทึก" }).click();
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
