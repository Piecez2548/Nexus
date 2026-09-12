import { expect, test } from "@playwright/test";

test("core finance flow survives a page reload", async ({ page }) => {
  test.setTimeout(60_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Add Transaction" }).click();
  await page.getByLabel("Item name").fill("Synthetic salary");
  await page.getByLabel("Amount").fill("15000");
  await page.getByLabel("Type").selectOption({ label: "Income" });
  await page.getByLabel("Category").selectOption({ label: "Salary" });
  await page.getByLabel("Account", { exact: true }).selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

  await page.getByRole("button", { name: "Add Transaction" }).click();
  await page.getByLabel("Item name").fill("Synthetic groceries");
  await page.getByLabel("Amount").fill("1250");
  await page.getByLabel("Category").selectOption({ label: "Food" });
  await page.getByLabel("Account", { exact: true }).selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeHidden();

  const summaryValue = (title: string) =>
    page.locator(".nexus-summary-card").filter({ hasText: title }).getByRole("heading", { level: 2 });

  await expect(summaryValue("Balance")).toHaveText("฿13,750");
  await expect(summaryValue("Income")).toHaveText("฿15,000");
  await expect(summaryValue("Expense")).toHaveText("฿1,250");
  await expect(page.getByText("Synthetic salary")).toBeVisible();
  await expect(page.getByText("Synthetic groceries")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(summaryValue("Balance")).toHaveText("฿13,750");
  await expect(summaryValue("Income")).toHaveText("฿15,000");
  await expect(summaryValue("Expense")).toHaveText("฿1,250");
  await expect(page.getByText("Synthetic salary")).toBeVisible();
  await expect(page.getByText("Synthetic groceries")).toBeVisible();

  await page.getByRole("button", { name: "Finance" }).click();
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Synthetic salary" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Synthetic groceries" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
