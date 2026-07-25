import { test, expect } from "@playwright/test";

test.describe("Quick Add templates", () => {
  test("creates a template and uses it to pre-fill a new transaction", async ({ page }) => {
    await page.goto("/favorites");

    await page.getByRole("button", { name: "เพิ่ม" }).click();
    await page.getByLabel("ชื่อ").fill("Starbucks");
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Food" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByLabel("จำนวนเงินเริ่มต้น (ไม่บังคับ)").fill("65");
    await page.getByRole("button", { name: "บันทึก" }).click();

    const pill = page.getByRole("button", { name: "Starbucks", exact: true });
    await expect(pill).toBeVisible();

    await pill.click();

    await expect(page.getByLabel("ชื่อรายการ")).toHaveValue("Starbucks");
    await expect(page.getByLabel("จำนวนเงิน")).toHaveValue("65");

    await page.getByRole("button", { name: "บันทึก" }).click();

    // Wait for the save to actually complete (the drawer's field unmounts
    // only after the async Dexie write + drawer-close finish) before
    // navigating away, otherwise the navigation can race the write.
    await expect(page.getByLabel("ชื่อรายการ")).toBeHidden();

    await page.goto("/transactions");
    const row = page.getByRole("row").filter({ hasText: "Starbucks" });
    await expect(row).toBeVisible();
    await expect(row.getByText("฿65")).toBeVisible();
  });

  test("deletes a Quick Add template", async ({ page }) => {
    await page.goto("/favorites");

    await page.getByRole("button", { name: "เพิ่ม" }).click();
    await page.getByLabel("ชื่อ").fill("Netflix");
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Entertainment" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByRole("button", { name: "Netflix", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete quick add Netflix" }).click();
    await expect(page.getByRole("button", { name: "Netflix", exact: true })).toHaveCount(0);
  });
});
