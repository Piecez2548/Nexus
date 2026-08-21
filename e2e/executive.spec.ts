import { test, expect } from "@playwright/test";

test.describe("executive dashboard", () => {
  test("loads from the nav and shows the Executive Summary in an empty-data state", async ({ page }) => {
    await page.goto("/");

    // The "Personal" sidebar group (which Executive lives in) starts
    // collapsed unless the current route is already inside it.
    await page.getByRole("button", { name: "Personal" }).click();
    await page.getByRole("link", { name: "Executive" }).click();
    await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible();

    await expect(page.getByText("Nothing urgent right now")).toBeVisible();
    await expect(page.getByText("Nothing overdue")).toBeVisible();
    await expect(page.getByText("No goals yet")).toBeVisible();
    await expect(page.getByText("Light")).toBeVisible();
  });

  test("a real overdue todo surfaces in the Priority section and links back to Todo", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("Overdue Executive Task");
    await page.getByLabel("Due date").fill("2020-01-01");
    await page.getByLabel("Priority Level").selectOption({ label: "High" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Overdue Executive Task")).toBeVisible();

    await page.goto("/executive");
    await expect(page.getByRole("heading", { name: "Top Priorities" })).toBeVisible();
    await expect(page.getByText("Overdue Executive Task").first()).toBeVisible();
    await expect(page.getByText(/item\(s\) overdue/)).toBeVisible();

    await page.locator('a[href="/todo"]').filter({ hasText: "View all" }).click();
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
  });

  test("survives a page refresh with the same data", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("Refresh Persistence Task");
    await page.getByLabel("Due date").fill("2020-01-01");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Refresh Persistence Task")).toBeVisible();

    await page.goto("/executive");
    await expect(page.getByText("Refresh Persistence Task").first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible();
    await expect(page.getByText("Refresh Persistence Task").first()).toBeVisible();
  });
});

test.describe("executive dashboard (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("is reachable from the More menu and renders on a narrow viewport", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name: "Executive" }).click();

    await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Executive Summary" })).toBeVisible();
  });
});
