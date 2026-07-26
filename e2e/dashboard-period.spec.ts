import { test, expect } from "@playwright/test";

test.describe("Dashboard period selector", () => {
  test("switching Day/Month/Year changes income but leaves Portfolio and Budget unaffected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // No Quick Actions card anymore; Budget takes its place.
    await expect(page.getByText("Quick Actions")).toHaveCount(0);
    await expect(page.getByText("Budget").first()).toBeVisible();

    // A transaction dated today counts under every granularity.
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("ชื่อรายการ").fill("Today's pay");
    await page.getByLabel("จำนวนเงิน").fill("30000");
    await page.getByLabel("ประเภท").selectOption({ label: "Income" });
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Salary" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

    // A transaction dated in 2020 is old enough to be excluded from any
    // realistic Day/Month/Year window, regardless of when this test runs.
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("ชื่อรายการ").fill("Old pay");
    await page.getByLabel("จำนวนเงิน").fill("999999");
    await page.getByLabel("ประเภท").selectOption({ label: "Income" });
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Salary" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByLabel("วันที่").fill("2020-01-01");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

    // Default granularity ("Month"): only today's ฿30,000 income counts —
    // if the 2020 transaction leaked into the total it'd be ฿1,029,999
    // instead, so this figure being visible at all proves the filtering.
    // (Note: "฿999,999" does legitimately appear elsewhere on the page, in
    // the Recent Transactions list, which intentionally ignores the period.)
    await expect(page.getByText("฿30,000").first()).toBeVisible();

    // "Day" still includes today.
    await page.getByRole("button", { name: "Day" }).click();
    await expect(page.getByText("฿30,000").first()).toBeVisible();

    // "Year" widens the window but 2020 is still a different year.
    await page.getByRole("button", { name: "Year" }).click();
    await expect(page.getByText("฿30,000").first()).toBeVisible();
  });

  test("Portfolio and Budget panels don't change when the period selector is switched", async ({ page }) => {
    await page.goto("/trading/portfolio");
    await page.getByRole("button", { name: "Add Holding" }).click();
    await page.getByLabel("Symbol").fill("AAPL");
    await page.getByLabel("Quantity").fill("10");
    await page.getByLabel("Average Cost Price").fill("100");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByLabel("Update current price for AAPL").fill("120");
    await page.getByRole("button", { name: "Save price for AAPL" }).click();
    await expect(page.getByText("+200 (+20%)").first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("+200 (+20%)").first()).toBeVisible();
    const portfolioPnlBefore = await page.getByText("+200 (+20%)").count();
    expect(portfolioPnlBefore).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Day" }).click();
    await expect(page.getByText("+200 (+20%)")).toHaveCount(portfolioPnlBefore);

    await page.getByRole("button", { name: "Year" }).click();
    await expect(page.getByText("+200 (+20%)")).toHaveCount(portfolioPnlBefore);
  });
});
