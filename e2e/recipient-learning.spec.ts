import { test, expect } from "@playwright/test";

test.describe("Rule Engine / Learning Engine", () => {
  test("learns a recipient's category and auto-applies it next time", async ({ page }) => {
    await page.goto("/transactions");

    // First visit: user manually categorizes.
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("ก๋วยเตี๋ยว");
    await page.getByLabel("Amount").fill("58");
    await page.getByRole("button", { name: "More" }).click();
    await page.getByLabel("Recipient / Phone / PromptPay").fill("0812345678");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("ก๋วยเตี๋ยว")).toBeVisible();

    // Second visit, same recipient: category auto-fills and is explained.
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("มื้อเที่ยง");
    await page.getByLabel("Amount").fill("65");
    await page.getByRole("button", { name: "More" }).click();
    await page.getByLabel("Recipient / Phone / PromptPay").fill("0812345678");

    await expect(page.getByLabel("Category")).toHaveValue("Food");
    await expect(page.getByText(/Suggested category/)).toBeVisible();

    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("มื้อเที่ยง")).toBeVisible();

    // The Recipient Profiles page reflects the learned history.
    await page.goto("/recipients");
    const row = page.getByRole("row").filter({ hasText: "0812345678" });
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell", { name: "2", exact: true })).toBeVisible(); // transaction count
  });
});
