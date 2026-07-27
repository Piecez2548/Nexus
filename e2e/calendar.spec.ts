import { test, expect } from "@playwright/test";

test.describe("calendar lifecycle", () => {
  test("add an event, edit it, and see it in the agenda list", async ({ page }) => {
    await page.goto("/calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Title").fill("Team meeting");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Team meeting" })).toBeVisible();

    await page.getByRole("button", { name: "Edit Team meeting" }).click();
    const titleInput = page.getByLabel("Title");
    await titleInput.fill("Team meeting (updated)");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Team meeting (updated)" })).toBeVisible();
  });

  test("deletes an event", async ({ page }) => {
    await page.goto("/calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Title").fill("One-off event");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "One-off event" })).toBeVisible();

    await page.getByRole("button", { name: "Delete One-off event" }).click();
    await expect(page.getByText("No events yet", { exact: false })).toBeVisible();
  });
});
