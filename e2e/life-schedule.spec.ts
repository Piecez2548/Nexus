import { test, expect } from "@playwright/test";

test.describe("life schedule lifecycle", () => {
  test("creates an item and shows it in the timeline", async ({ page }) => {
    await page.goto("/schedule");

    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Morning workout");
    await page.getByLabel("Start time").fill("07:00");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Morning workout" })).toBeVisible();
  });

  test("edits an item from the timeline", async ({ page }) => {
    await page.goto("/schedule");

    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Old title");
    await page.getByLabel("Start time").fill("08:00");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Old title" })).toBeVisible();

    await page.getByRole("button", { name: "Edit Old title" }).click();
    const titleInput = page.getByLabel("Title", { exact: true });
    await titleInput.fill("New title");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "New title" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Old title" })).not.toBeVisible();
  });

  test("deletes an item", async ({ page }) => {
    await page.goto("/schedule");

    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Evening walk");
    await page.getByLabel("Start time").fill("18:00");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Evening walk" })).toBeVisible();

    await page.getByRole("button", { name: "Delete Evening walk" }).click();
    await expect(page.getByText("No schedule items yet — press the Add Item button to start")).toBeVisible();
  });
});
