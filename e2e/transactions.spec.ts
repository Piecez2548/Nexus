import { test, expect, type Page } from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// A minimal 1x1 PNG — real OCR accuracy isn't what these tests check; they
// confirm the on-device Tesseract pipeline starts inside the bundled app.
const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

// On the web the scanner asks for a folder (webkitdirectory), so hand the
// file chooser a real directory of slips.
async function chooseSlipFolder(page: Page, count: number) {
  const dir = await mkdtemp(path.join(tmpdir(), "nexus-slips-"));
  for (let i = 1; i <= count; i++) await writeFile(path.join(dir, `slip${i}.png`), pngBuffer);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose image folder" }).click();
  await (await chooser).setFiles(dir);
}

test.describe("transaction lifecycle", () => {
  test("add, edit, and delete a transaction end to end", async ({ page }) => {
    await page.goto("/transactions");

    // --- Add ---
    await page.getByRole("button", { name: "Add Transaction" }).click();

    await page.getByLabel("Item name").fill("Coffee");
    await page.getByLabel("Amount").fill("120");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account", { exact: true }).selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();

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

    const amountInput = page.getByLabel("Amount");
    await expect(amountInput).toHaveValue("120");
    await amountInput.fill("200");
    await page.getByRole("button", { name: "Save" }).click();

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
    await page.locator("#transaction-type").selectOption({ label: "Transfer" });
    await page.getByLabel("Item name").fill("Move to bank");
    await page.getByLabel("Amount").fill("500");
    await page.getByLabel("From Account").selectOption({ label: "Cash" });
    await page.getByLabel("To Account").selectOption({ label: "Bank" });
    await page.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("row").filter({ hasText: "Move to bank" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Transfer")).toBeVisible();
    await expect(row.getByText("→ Bank")).toBeVisible();
  });

  test("shows a validation error instead of saving an invalid transaction", async ({ page }) => {
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Amount").fill("120");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Item name is required")).toBeVisible();
  });

  test("the dashboard's header button opens the transaction drawer", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Add Transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeVisible();

    // Close via the backdrop.
    await page.mouse.click(10, 10);
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();
  });

  test("the slip scanner opens, accepts an image, and starts on-device OCR", async ({ page }) => {
    await page.goto("/transactions");

    await page.locator("button").filter({ hasText: "Scan Gallery" }).click();
    await expect(page.getByText("Scan your gallery")).toBeVisible();
    await chooseSlipFolder(page, 1);

    await expect(page.getByText("Scan progress")).toBeVisible();
  });

  test("selecting multiple slips from the gallery starts a batch scan and shows a review list", async ({ page }) => {
    await page.goto("/transactions");

    await page.locator("button").filter({ hasText: "Scan Gallery" }).click();
    await chooseSlipFolder(page, 2);

    await expect(page.getByText("Scan progress")).toBeVisible();
    await expect(page.getByText("Import preview")).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole("button", { name: /Import \d+ selected/ })).toBeVisible();
  });
});
