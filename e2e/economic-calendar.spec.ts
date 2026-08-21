import { test, expect } from "@playwright/test";

test.describe("Economic Calendar", () => {
  test("add, edit, and delete an event end to end", async ({ page }) => {
    await page.goto("/trading/economic-calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Event title").fill("FOMC Meeting");
    await page.getByLabel("Date").fill("2099-01-15");
    await page.getByLabel("Impact").selectOption({ label: "High Impact" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("FOMC Meeting")).toBeVisible();

    await page.getByRole("button", { name: "Edit FOMC Meeting" }).click();
    await page.getByLabel("Event title").fill("FOMC Rate Decision");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("FOMC Rate Decision")).toBeVisible();

    await page.getByRole("button", { name: "Delete FOMC Rate Decision" }).click();
    await expect(page.getByText("FOMC Rate Decision")).not.toBeVisible();
    await expect(page.getByText("No events yet")).toBeVisible();
  });

  // Regression: the Impact <select> renders a "-" placeholder for its
  // optional field but wasn't coerced to undefined on submit -- leaving it
  // unselected silently failed Zod validation with no error shown, so the
  // form never closed. Fixed by adding emptyToUndefined's setValueAs.
  test("saves successfully when the optional Impact field is left unselected", async ({ page }) => {
    await page.goto("/trading/economic-calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Event title").fill("CPI Release");
    await page.getByLabel("Date").fill("2099-02-10");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("CPI Release")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Event" })).not.toBeVisible();
  });

  test("shows a validation error instead of saving with no title", async ({ page }) => {
    await page.goto("/trading/economic-calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Event title is required")).toBeVisible();
  });

  test("a future event appears in the Trading Dashboard's upcoming-events widget; a past one does not", async ({ page }) => {
    await page.goto("/trading/economic-calendar");

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Event title").fill("Upcoming NFP");
    await page.getByLabel("Date").fill("2099-03-01");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Upcoming NFP")).toBeVisible();

    await page.getByRole("button", { name: "Add Event" }).click();
    await page.getByLabel("Event title").fill("Already Happened");
    await page.getByLabel("Date").fill("2020-01-01");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Already Happened")).toBeVisible();

    await page.goto("/trading");
    await expect(page.getByRole("heading", { name: "Upcoming Events" })).toBeVisible();
    // Only one "Upcoming Events" widget exists on this page -- a matching
    // title anywhere on the dashboard confirms it surfaced there.
    await expect(page.getByText("Upcoming NFP")).toBeVisible();
    await expect(page.getByText("Already Happened")).not.toBeVisible();
  });
});
