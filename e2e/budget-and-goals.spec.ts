import { test, expect } from "@playwright/test";

test.describe("budget lifecycle", () => {
  test("set a budget and watch its progress update as expenses are added", async ({ page }) => {
    await page.goto("/budget");

    await page.getByRole("button", { name: "Add Budget" }).click();
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Amount").fill("1000");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("table").getByText("฿0 / ฿1,000")).toBeVisible();

    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Item name").fill("Lunch");
    await page.getByLabel("Amount").fill("400");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByLabel("Account").selectOption({ label: "Cash" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("table").getByText("Lunch")).toBeVisible();

    await page.goto("/budget");
    await expect(page.getByRole("table").getByText("฿400 / ฿1,000")).toBeVisible();
    await expect(page.getByRole("table").getByText("฿600 left")).toBeVisible();
  });

  test("deletes a budget", async ({ page }) => {
    await page.goto("/budget");

    await page.getByRole("button", { name: "Add Budget" }).click();
    await page.getByLabel("Category").selectOption({ label: "Transport" });
    await page.getByLabel("Amount").fill("500");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("cell", { name: "Transport", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete Transport budget" }).click();
    await expect(page.getByText("No budgets yet")).toBeVisible();
  });
});

test.describe("saving goal lifecycle", () => {
  test("create a goal, contribute toward it, and see it complete", async ({ page }) => {
    await page.goto("/goals");

    await page.getByRole("button", { name: "Add Goal" }).click();
    await page.getByLabel("Goal name").fill("Emergency Fund");
    await page.getByLabel("Target (THB)").fill("1000");
    await page.getByLabel("Current (THB)").fill("0");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("฿0 / ฿1,000")).toBeVisible();

    await page.getByLabel("Contribute to Emergency Fund").fill("1000");
    await page.getByRole("button", { name: "Add contribution to Emergency Fund" }).click();

    await expect(page.getByText("Complete 🎉")).toBeVisible();
  });

  test("deletes a goal", async ({ page }) => {
    await page.goto("/goals");

    await page.getByRole("button", { name: "Add Goal" }).click();
    await page.getByLabel("Goal name").fill("MacBook");
    await page.getByLabel("Target (THB)").fill("60000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("MacBook")).toBeVisible();

    await page.getByRole("button", { name: "Delete MacBook" }).click();
    await expect(page.getByText("No saving goals yet")).toBeVisible();
  });
});
