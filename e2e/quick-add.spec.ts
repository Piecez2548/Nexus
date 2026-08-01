import { test, expect } from "@playwright/test";

test.describe("Quick Add templates", () => {
  test("creates a template and uses it to pre-fill a new transaction", async ({ page }) => {
    await page.goto("/favorites");

    await page.getByRole("button", { name: "Add" }).click();
    await page.getByLabel("Name").fill("Starbucks");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByLabel("Starting amount (optional)").fill("65");
    await page.getByRole("button", { name: "Save" }).click();

    const pill = page.getByRole("button", { name: "Starbucks", exact: true });
    await expect(pill).toBeVisible();

    await pill.click();

    await expect(page.getByLabel("Item name")).toHaveValue("Starbucks");
    await expect(page.getByLabel("Amount")).toHaveValue("65");

    await page.getByRole("button", { name: "Save" }).click();

    // Wait for the save to actually complete (the drawer's field unmounts
    // only after the async Dexie write + drawer-close finish) before
    // navigating away, otherwise the navigation can race the write.
    await expect(page.getByLabel("Item name")).toBeHidden();

    await page.goto("/transactions");
    const row = page.getByRole("row").filter({ hasText: "Starbucks" });
    await expect(row).toBeVisible();
    await expect(row.getByText("฿65")).toBeVisible();
  });

  test("deletes a Quick Add template", async ({ page }) => {
    await page.goto("/favorites");

    await page.getByRole("button", { name: "Add" }).click();
    await page.getByLabel("Name").fill("Netflix");
    await page.getByLabel("Category").selectOption({ label: "Entertainment" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("button", { name: "Netflix", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete quick add Netflix" }).click();
    await expect(page.getByRole("button", { name: "Netflix", exact: true })).toHaveCount(0);
  });
});
