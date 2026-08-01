import { test, expect } from "@playwright/test";

test.describe("App Lock", () => {
  test("enables a PIN, locks, and unlocks the app", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: "Enable App Lock" }).click();
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN").fill("1234");
    // Uncheck "remember me" so a reload requires the PIN again.
    await page.getByLabel(/Remember me on this device/).uncheck();
    await page.getByRole("button", { name: "Set Up PIN" }).click();

    await expect(page.getByText("App Lock is enabled")).toBeVisible();

    // "sessionUnlocked" is stored in sessionStorage, which survives a plain
    // reload within the same tab by design (that's what makes the unlock
    // last for the rest of the session). Clearing it first simulates what
    // happens in a genuinely new tab/session when "remember me" is off.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Unlock Nexus" })).toBeVisible();

    // Wrong PIN shows an error and stays locked.
    await page.getByLabel("PIN", { exact: true }).fill("0000");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText("Incorrect PIN")).toBeVisible();

    // Correct PIN unlocks the app, returning to the page it reloaded on.
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("Lock Now immediately re-locks the app", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: "Enable App Lock" }).click();
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN").fill("1234");
    await page.getByRole("button", { name: "Set Up PIN" }).click();

    await page.getByRole("button", { name: "Lock Now" }).click();
    await expect(page.getByRole("heading", { name: "Unlock Nexus" })).toBeVisible();
  });

  test("disables App Lock so the app no longer prompts", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: "Enable App Lock" }).click();
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN").fill("1234");
    await page.getByLabel(/Remember me on this device/).uncheck();
    await page.getByRole("button", { name: "Set Up PIN" }).click();

    await page.getByRole("button", { name: "Disable" }).click();
    await page.getByLabel("Enter PIN to confirm").fill("1234");
    await page.getByRole("button", { name: "Turn Off App Lock" }).click();

    await expect(page.getByRole("button", { name: "Enable App Lock" })).toBeVisible();

    // A reload should no longer show the unlock screen.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
