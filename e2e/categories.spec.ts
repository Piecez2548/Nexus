import { test, expect } from "@playwright/test";

test.describe("category lifecycle", () => {
  test("add, edit, and delete a category end to end", async ({ page }) => {
    await page.goto("/categories");

    await page.getByRole("button", { name: "Add Category" }).click();
    await page.getByLabel("ชื่อหมวดหมู่").fill("Groceries");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("Groceries")).toBeVisible();

    await page.getByRole("button", { name: "Edit Groceries" }).click();
    await page.getByLabel("ชื่อหมวดหมู่").fill("Supermarket");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("Supermarket")).toBeVisible();
    await expect(page.getByText("Groceries")).toHaveCount(0);

    await page.getByRole("button", { name: "Delete Supermarket" }).click();
    await expect(page.getByText("Supermarket")).toHaveCount(0);
  });

  test("merges a category into another and reassigns its transactions", async ({ page }) => {
    // "Food" is seeded by default. Create a second expense category to merge from.
    await page.goto("/categories");
    await page.getByRole("button", { name: "Add Category" }).click();
    await page.getByLabel("ชื่อหมวดหมู่").fill("Snacks");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("Snacks")).toBeVisible();

    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("ชื่อรายการ").fill("Chips");
    await page.getByLabel("จำนวนเงิน").fill("50");
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Snacks" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByRole("table").getByText("Chips")).toBeVisible();

    await page.goto("/categories");
    await page.getByRole("button", { name: "Merge Snacks" }).click();
    await page.getByLabel("รวมเข้ากับ").selectOption({ label: "Food" });
    await page.getByRole("button", { name: "รวมหมวดหมู่" }).click();

    await expect(page.getByText("Snacks")).toHaveCount(0);

    await page.goto("/transactions");
    const row = page.getByRole("row").filter({ hasText: "Chips" });
    await expect(row.getByText("Food")).toBeVisible();
  });
});
