import { test, expect } from "@playwright/test";

test.describe("todo lifecycle", () => {
  test("add, complete, edit, and delete a todo end to end", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("ส่งรายงาน");
    await page.getByLabel("Priority Level").selectOption({ label: "High" });
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("ส่งรายงาน")).toBeVisible();
    await expect(page.getByText("1 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Edit ส่งรายงาน" }).click();
    const titleInput = page.getByLabel("Task name");
    await titleInput.fill("ส่งรายงานประจำเดือน");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("ส่งรายงานประจำเดือน")).toBeVisible();

    await page.getByRole("button", { name: "Mark ส่งรายงานประจำเดือน as done" }).click();
    await expect(page.getByText("0 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Delete ส่งรายงานประจำเดือน" }).click();
    await expect(page.getByText("No tasks to do yet")).toBeVisible();
  });

  test("shows a validation error instead of saving an empty todo", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Task name is required")).toBeVisible();
  });

  test("a pending todo shows in the Dashboard preview and can be completed from there", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("ซื้อของเข้าบ้าน");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("ซื้อของเข้าบ้าน")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
    await expect(page.getByText("ซื้อของเข้าบ้าน")).toBeVisible();

    await page.getByRole("button", { name: "Mark ซื้อของเข้าบ้าน as done" }).click();
    await expect(page.getByText("Nothing to do right now")).toBeVisible();
  });

  test("toolbar filters todos by search, status, and priority", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("งานด่วน");
    await page.getByLabel("Priority Level").selectOption({ label: "High" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("งานด่วน")).toBeVisible();

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("งานทั่วไป");
    await page.getByLabel("Priority Level").selectOption({ label: "Low" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("งานทั่วไป")).toBeVisible();

    await page.getByPlaceholder("Search todos...").fill("ด่วน");
    await expect(page.getByText("งานด่วน")).toBeVisible();
    await expect(page.getByText("งานทั่วไป")).not.toBeVisible();

    await page.getByPlaceholder("Search todos...").fill("");
    await page.getByLabel("Priority", { exact: true }).selectOption({ label: "High" });
    await expect(page.getByText("งานด่วน")).toBeVisible();
    await expect(page.getByText("งานทั่วไป")).not.toBeVisible();
  });

  test("completing an action increases the level badge's XP and streak", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("Task name").fill("งานทดสอบ");
    await page.getByLabel("Priority Level").selectOption({ label: "High" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("งานทดสอบ")).toBeVisible();

    await page.getByRole("button", { name: "Mark งานทดสอบ as done" }).click();

    await page.getByRole("button", { name: "Level and streak" }).click();
    await expect(page.getByText("20 / 100 XP")).toBeVisible();
    await expect(page.getByText("1 day streak")).toBeVisible();
  });
});
