import { test, expect } from "@playwright/test";

test.describe("Merge Duplicate Transactions", () => {
  test("finds a strict-match duplicate, previews it, and merges on confirm", async ({ page }) => {
    await page.goto("/transactions");

    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Add Transaction" }).click();
      await page.getByLabel("Item name").fill("Lunch");
      await page.getByLabel("Amount").fill("100");
      await page.getByLabel("Category").selectOption({ label: "Food" });
      await page.getByLabel("Account").selectOption({ label: "Cash" });
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();
    }

    await expect(page.getByRole("row").filter({ hasText: "Lunch" })).toHaveCount(2);

    await page.goto("/settings");
    await page.getByRole("button", { name: /Merge Duplicate Transactions/ }).click();

    await expect(page.getByText("Found 1 duplicate group(s)")).toBeVisible();
    await expect(page.getByText("Kept (oldest)")).toBeVisible();
    await expect(page.getByText("1 duplicate(s) will be removed")).toBeVisible();

    await page.getByRole("button", { name: "Merge 1 selected" }).click();
    await expect(page.getByText("Removed 1 duplicate transactions").first()).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByRole("row").filter({ hasText: "Lunch" })).toHaveCount(1);
  });

  test("reports no duplicates and doesn't remove anything when transactions differ", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Lunch");
    await page.getByLabel("Amount").fill("100");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Dinner");
    await page.getByLabel("Amount").fill("200");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

    await page.goto("/settings");
    await page.getByRole("button", { name: /Merge Duplicate Transactions/ }).click();

    await expect(page.getByText("No duplicate transactions found")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByRole("row").filter({ hasText: "Lunch" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "Dinner" })).toHaveCount(1);
  });
});
