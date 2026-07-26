import { test, expect } from "@playwright/test";

test.describe("transaction lifecycle", () => {
  test("add, edit, and delete a transaction end to end", async ({ page }) => {
    await page.goto("/transactions");

    // --- Add ---
    await page.getByRole("button", { name: "Add Transaction" }).click();

    await page.getByLabel("ชื่อรายการ").fill("Coffee");
    await page.getByLabel("จำนวนเงิน").fill("120");
    await page.getByLabel("หมวดหมู่").selectOption({ label: "Food" });
    await page.getByLabel("บัญชี").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "บันทึก" }).click();

    const row = page.getByRole("row").filter({ hasText: "Coffee" });
    await expect(row).toBeVisible();
    await expect(row.getByText("฿120")).toBeVisible();

    // Reflected on the dashboard too.
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Coffee")).toBeVisible();

    // --- Edit ---
    await page.getByRole("link", { name: "Transactions" }).click();
    await page.getByRole("button", { name: "Edit Coffee" }).click();

    const amountInput = page.getByLabel("จำนวนเงิน");
    await expect(amountInput).toHaveValue("120");
    await amountInput.fill("200");
    await page.getByRole("button", { name: "บันทึก" }).click();

    const updatedRow = page.getByRole("row").filter({ hasText: "Coffee" });
    await expect(updatedRow.getByText("฿200")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "฿120" })).toHaveCount(0);

    // --- Delete ---
    await page.getByRole("button", { name: "Delete Coffee" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Coffee" })).toHaveCount(0);
  });

  test("creates a transfer between two accounts", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("ประเภท").selectOption({ label: "Transfer" });
    await page.getByLabel("ชื่อรายการ").fill("Move to bank");
    await page.getByLabel("จำนวนเงิน").fill("500");
    await page.getByLabel("บัญชีต้นทาง").selectOption({ label: "Cash" });
    await page.getByLabel("บัญชีปลายทาง").selectOption({ label: "Bank" });
    await page.getByRole("button", { name: "บันทึก" }).click();

    const row = page.getByRole("row").filter({ hasText: "Move to bank" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Transfer")).toBeVisible();
    await expect(row.getByText("→ Bank")).toBeVisible();
  });

  test("shows a validation error instead of saving an invalid transaction", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("จำนวนเงิน").fill("120");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("กรุณากรอกชื่อรายการ")).toBeVisible();
  });

  test("the dashboard's header button opens the transaction drawer", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeVisible();

    // Close via the backdrop.
    await page.mouse.click(10, 10);
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();
  });

  test("the slip scanner opens, accepts an image, and starts on-device OCR", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Scan Slip" }).click();
    await expect(page.getByText("ประมวลผลในเครื่องทั้งหมด")).toBeVisible();

    // A minimal 1x1 PNG — real OCR accuracy isn't what this test is checking;
    // it's confirming the on-device Tesseract pipeline actually starts inside
    // the real bundled app (WASM/worker loading, not just the mocked unit test).
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );

    await page.getByLabel(/เลือกจากคลังภาพ/).setInputFiles({
      name: "slip.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    await expect(page.getByText("กำลังอ่านสลิป...")).toBeVisible();
  });

  test("selecting multiple slips from the gallery starts a batch scan and shows a review list", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Scan Slip" }).click();

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );

    await page.getByLabel(/เลือกจากคลังภาพ/).setInputFiles([
      { name: "slip1.png", mimeType: "image/png", buffer: pngBuffer },
      { name: "slip2.png", mimeType: "image/png", buffer: pngBuffer },
    ]);

    await expect(page.getByText(/กำลังอ่านสลิป \d\/2/)).toBeVisible();
    await expect(page.getByText("พบ 2 รายการ ตรวจสอบก่อนบันทึก")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: /บันทึกทั้งหมด/ })).toBeVisible();
  });
});
