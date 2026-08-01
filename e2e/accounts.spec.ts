import { test, expect } from "@playwright/test";

test.describe("account lifecycle", () => {
  test("add, edit, and delete an account end to end", async ({ page }) => {
    await page.goto("/accounts");

    await page.getByRole("button", { name: "Add Account" }).click();
    await page.getByLabel("Account name").fill("Travel Fund");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Travel Fund")).toBeVisible();

    await page.getByRole("button", { name: "Edit Travel Fund" }).click();
    const nameInput = page.getByLabel("Account name");
    await nameInput.fill("Vacation Fund");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Vacation Fund")).toBeVisible();
    await expect(page.getByText("Travel Fund")).toHaveCount(0);

    await page.getByRole("button", { name: "Delete Vacation Fund" }).click();
    await expect(page.getByText("Vacation Fund")).toHaveCount(0);
  });

  test("refuses to delete an account referenced by a transaction", async ({ page }) => {
    await page.goto("/accounts");

    // "Cash" is seeded by default and has no transactions against it yet —
    // create one via the Transactions page first.
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Coffee");
    await page.getByLabel("Amount").fill("100");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("Coffee")).toBeVisible();

    await page.goto("/accounts");
    await page.getByRole("button", { name: "Delete Cash" }).click();

    // The error surfaces twice by design: a persistent inline banner and an
    // ambient toast notification. Scope to the inline banner specifically.
    await expect(
      page.getByRole("main").getByText("Can't delete an account with existing transactions")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Cash" })).toBeVisible();
  });
});
