import { test, expect } from "@playwright/test";

test.describe("Strategy Library", () => {
  test("add, edit, and delete a strategy end to end", async ({ page }) => {
    await page.goto("/trading/strategies");

    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByLabel("Strategy name").fill("Breakout Pro");
    await page.getByLabel("Entry rules").fill("Close above resistance on volume");
    await page.getByLabel("Exit rules").fill("Trail stop below prior swing low");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Breakout Pro")).toBeVisible();

    await page.getByRole("button", { name: "Edit Breakout Pro" }).click();
    await page.getByLabel("Strategy name").fill("Breakout Pro V2");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Breakout Pro V2")).toBeVisible();
    await expect(page.getByText("Breakout Pro", { exact: true })).not.toBeVisible();

    await page.getByRole("button", { name: "Delete Breakout Pro V2" }).click();
    await expect(page.getByText("Breakout Pro V2")).not.toBeVisible();
    await expect(page.getByText("No strategies yet")).toBeVisible();
  });

  // Regression: the Market <select> renders a "-" placeholder for its
  // optional field but wasn't coerced to undefined on submit -- leaving it
  // unselected silently failed Zod validation with no error shown, so the
  // form never closed. Fixed by adding emptyToUndefined's setValueAs.
  test("saves successfully when the optional Market field is left unselected", async ({ page }) => {
    await page.goto("/trading/strategies");

    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByLabel("Strategy name").fill("Reversal");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Reversal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Strategy" })).not.toBeVisible();
  });

  test("shows a validation error instead of saving a strategy with no name", async ({ page }) => {
    await page.goto("/trading/strategies");

    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Strategy name is required")).toBeVisible();
  });

  test("offers a saved strategy's name as a suggestion on the trade form's Strategy field", async ({ page }) => {
    await page.goto("/trading/strategies");
    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByLabel("Strategy name").fill("Momentum Play");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Momentum Play")).toBeVisible();

    await page.goto("/trading/journal");
    await page.getByRole("button", { name: "Add Trade" }).click();

    const strategyInput = page.getByLabel("Strategy");
    await expect(strategyInput).toHaveAttribute("list", "trade-strategy-suggestions");
    // <option value="X" /> has no text child (the browser suggests the
    // `value` attribute itself), so the check is against `value`, not
    // rendered text content, which would always be empty here.
    await expect(page.locator("#trade-strategy-suggestions option")).toHaveAttribute("value", "Momentum Play");

    // Free text stays valid -- no hard foreign key to the Strategy Library.
    await strategyInput.fill("Some Unlisted Strategy");
    await expect(strategyInput).toHaveValue("Some Unlisted Strategy");
  });

  test("refresh preserves the strategy list (real persistence, not just in-memory state)", async ({ page }) => {
    await page.goto("/trading/strategies");
    await page.getByRole("button", { name: "Add Strategy" }).click();
    await page.getByLabel("Strategy name").fill("Persisted Strategy");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Persisted Strategy")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Persisted Strategy")).toBeVisible();
  });
});
