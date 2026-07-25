import { test, expect } from "@playwright/test";

test.describe("habit lifecycle", () => {
  test("add a habit, check it in, and see a 1-day streak", async ({ page }) => {
    await page.goto("/habits");

    await page.getByRole("button", { name: "Add Habit" }).click();
    await page.getByLabel("Habit name").fill("Exercise");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Exercise" })).toBeVisible();

    await page.getByRole("button", { name: "Mark Exercise done for today" }).click();
    await expect(page.getByText("1 day streak")).toBeVisible();
  });

  test("deletes a habit", async ({ page }) => {
    await page.goto("/habits");

    await page.getByRole("button", { name: "Add Habit" }).click();
    await page.getByLabel("Habit name").fill("Meditate");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Meditate" })).toBeVisible();

    await page.getByRole("button", { name: "Delete Meditate" }).click();
    await expect(page.getByText("No habits yet")).toBeVisible();
  });
});
